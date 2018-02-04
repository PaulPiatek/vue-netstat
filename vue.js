// for dev:
// const Vue = require('vue/dist/vue.js');
const Vue = require('vue/dist/vue.min.js');
var ping = require('net-ping');
const Stat = require("./stat.js");
var Multimap = require('multimap');
const uuidv1 = require('uuid/v1');
var wstat = require('windows-netstat');
var _ = require('lodash');

var session = ping.createSession ({timeout:1000});

var v = new Vue({
    el: '#app',
    data: {
      established: true,
      pids: [],
      stats: new Multimap(),
      sortKey: 'pid',
      reverse: false,
      protocolFilter: 'all',
      columns: ['pid', 'protocol', 'taskName', 'localIp', 'localPort', 'ip', 'port', 'state', 'ping']
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
        }
    }
  });

async function getStats()
{
    let netstatData = wstat();

    for (data of netstatData)
    {
        let stat = new Stat();
        stat.setPid(data.pid);
        stat.setTaskName(data.taskName);
        stat.setProtocol(data.protocol);
        stat.setIp(data.remoteIP);
        stat.setPort(data.remotePort);
        stat.setLocalIp(data.localIP);
        stat.setLocalPort(data.localPort);
        stat.setState(data.state);
        stat.setUpdateTime(new Date().getTime());
        stat.setUid(uuidv1());
        if (v.stats.has(data.pid))   
        {
            let found = false;
            for (currentstat of v.stats.get(data.pid)){
                if (currentstat.localPort === data.localPort && currentstat.ip === data.remoteIP){
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
    }
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
            v.pids[i].ping = ms;
            v.pids.splice(i, 1, v.pids[i]);
        }
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

