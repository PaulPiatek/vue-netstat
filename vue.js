// for dev:
// const Vue = require('vue/dist/vue.js');
const Vue = require('vue/dist/vue.min.js');
var netstat = require('node-netstat');
var ping = require('net-ping');
const Stat = require("./stat.js");
var Multimap = require('multimap');
const uuidv1 = require('uuid/v1');
const tasklist = require('tasklist');
var wstat = require('windows-netstat');
console.log(wstat());
var _ = require('lodash');

var session = ping.createSession ({timeout:1000});

var v = new Vue({
    el: '#app',
    data: {
      established: true,
      pids: [],
      stats: new Multimap(),
      taskMap: new Map(),
      sortKey: 'pid',
      reverse: false,
      protocolFilter: 'all',
      columns: ['pid', 'protocol', 'taskName', 'localPort', 'ip', 'port', 'state', 'ping']
    },
    computed: {
        ordereredPIDs: function () {
            return _.orderBy(
                _.filter(this.pids, function(pid){
                    if (v.established && pid.state == 'ESTABLISHED' || !v.established){
                        if (v.protocolFilter == 'all' || v.protocolFilter === pid.protocol){
                            return pid;
                        }
                    }
                }),
                this.sortKey, this.reverse ? 'desc' : 'asc'
            );
        }
    }, 
    methods: {
        sortBy: function(sortKey) {
          this.reverse = (this.sortKey == sortKey) ? ! this.reverse : false;
          this.sortKey = sortKey;
        },
        getImageName(pid){
            if (this.taskMap.get(pid)){
                return this.taskMap.get(pid);
            }
            else{
                fillTasklist();
                return '';
            }
        }

    }
  });

async function getStats()
{
    netstat({
        filter: {
            //protocol: 'tcp'
        }
    }, function (data) {
        let stat = new Stat();
        stat.setPid(data.pid);
        stat.setProtocol(data.protocol);
        stat.setIp(data.remote.address);
        stat.setPort(data.remote.port);
        stat.setLocalPort(data.local.port);
        stat.setState(data.state);
        stat.fixUDP();
        stat.setUpdateTime(new Date().getTime());
        stat.setUid(uuidv1());
        if (v.stats.has(data.pid))   
        {
            let found = false;
            for (currentstat of v.stats.get(data.pid)){
                if (currentstat.localPort === data.local.port && currentstat.ip === data.remote.address){
                    currentstat.setUpdateTime(new Date().getTime());
                    found = true;
                    break;
                }
                
            }
            if (found === false){
                v.stats.get(data.pid).push(stat);
                v.pids.push(stat);
            }
        }
        else{
            v.stats.set(data.pid, stat);
            v.pids.push(stat);
        }
    });
}


async function cleanup() {
    v.stats.forEachEntry(function (entry, key) {
        for (let stat of entry) {
            if (new Date().getTime() - stat.updateTime > 2000) {
                for (i in v.pids)  {
                    if (v.pids[i].uid === stat.uid){
                        v.pids.splice(i, 1);
                        break;
                    }
                }
                v.stats.delete(key, stat);
            }
            if (v.stats.get(key).length === 0) {
                v.stats.delete(key);
                v.taskMap.delete(key);
            }
        }
    });
}


function pingIt() {
    var ipSet = new Set();
    for (pid of v.pids) {
        if (! ipSet.has(pid.ip)){
            if (pid.state !== null && (pid.state === 'ESTABLISHED' || pid.state.indexOf('WAIT') > 0)){
                ipSet.add(pid.ip);
                session.pingHost (pid.ip, function (error, target, sent, rcvd) {
                    if (error){
                        setPingResult(target, null);
                    }
                    else{
                        var ms = rcvd - sent;
                        setPingResult(target, ms);
                    }
                });
            }
        }
    }
}
function setPingResult(ip, ms) {
    for (i in v.pids)  {
        if (v.pids[i].ip === ip){
            //pid = v.pids[i];
            //pid.ping = ms;
            //v.pids.splice(i, 1, pid);
            v.pids[i].ping = ms;
            v.pids.splice(i, 1, v.pids[i]);
        }
    }
}

function getTaskNames() {
    for (pid of v.pids) {
        if(pid.taskName === undefined)
        {
            if (v.taskMap.get(pid.pid)){
                setTaskName(pid.pid, v.taskMap.get(pid.pid));
            }
            else{
                fillTasklist();
                return '';
            }
        }
    }
}
function setTaskName(pid, taskName) {
    for (i in v.pids)  {
        if (v.pids[i].pid === pid){
            v.pids[i].taskName = taskName;
            v.pids.splice(i, 1, v.pids[i]);
        }
    }
}


updateTaskListScheduled = false;
function fillTasklist(){
    if (!updateTaskListScheduled){
        updateTaskListScheduled = true;
        tasklist().then(tasks => {
            for (let task of tasks){
                v.taskMap.delete(task.pid);
                v.taskMap.set(task.pid, task.imageName);
            }
        }).then( () => {
            updateTaskListScheduled = false;
        });
    }
}

async function mainLoop()
{
    await getStats();
    await cleanup();
}

getStats();
setInterval(mainLoop, 2000);
setInterval(pingIt, 5000);
setInterval(getTaskNames, 1000);

