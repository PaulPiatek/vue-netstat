class Stat{

    getPid() {
        return this.pid;
    }
    setPid(pid) {
        this.pid = pid;
    }
    getTaskName() {
        return this.taskName;
    }
    setTaskName(taskName) {
        this.taskName = taskName;
    }
    getProtocol() {
        return this.protocol;
    }
    setProtocol(protocol) {
        this.protocol = protocol;
    }    
    getLocalPort() {
        return this.localPort;
    }
    setLocalPort(localPort) {
        this.localPort = localPort;
    }

    setIp(ip){
        this.ip = ip;
    }
    getIp(){
        return this.ip;
    }
    getPort() {
        return this.port;
    }
    setPort(port) {
        this.port = port;
    }

    getState() {
        return this.state;
    }
    setState(state) {
        this.state = state;
    }

    setPing(ping){
        this.pingResult = ping;
    }
    getPing(){
        return this.ping;
    }

    getUid() {
        return this.uid;
    }
    setUid(uid) {
        this.uid = uid;
    }

    getUpdateTime() {
        return this.updateTime;
    }
    setUpdateTime(updateTime) {
        this.updateTime = updateTime;
    }

    fixUDP()
    {
        if (this.protocol === 'udp' && this.ip === '*'){
            this.port = null;
            this.state = null;
        }
    }

}

module.exports = Stat;