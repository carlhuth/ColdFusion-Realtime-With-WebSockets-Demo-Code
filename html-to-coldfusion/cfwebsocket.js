function cfwebsocket (
    appName,
    channel,
    appStartPath,
    onMessage,
    onSubscribe,
    isProxy,
    wsPort,
    server,
    secure,
    customOptions
){
    var me = this;
    var theCustomOptions = customOptions || {};

    this.server     = server ? server : location.hostname;
    this.isSecure   = secure ? secure : (location.protocol === 'https:' ? true : false);
    this.protocol   = this.isSecure ? 'wss' : 'ws';
    this.port       = wsPort ? wsPort : (isProxy ? '' : (this.isSecure ? 8543 : 8577));
    this.path       = isProxy ? '/cfws/' : '/cfusion/cfusion';
    this.server     = `${this.protocol}://${this.server}${this.port ? `:${this.port}` : ''}`;
    this.ws         = new WebSocket(`${this.server}${this.path}`);

    // cf json properties for sending messages
    this.subscribe   = {ns: 'coldfusion.websocket.channels', type: 'subscribe', channel: channel, appName: appName,customOptions:theCustomOptions},
    this.unsubscribe = {ns: 'coldfusion.websocket.channels', type: 'unsubscribe', channel: channel, appName: appName},
    this.message     = {ns: 'coldfusion.websocket.channels', type: 'publish', channel: channel, data:'', appName: appName,customOptions:theCustomOptions};

    // WebSocket API Events
    this.ws.onopen = function(e){
        me.subscribeMe();
    };

   this.ws.onmessage = function(e){
        // when we receive a message pass it to the parseMessage function (the data piece of the object received)
        var data = JSON.parse(e.data);
        // looks like we are calling before CF has been executed
        if (data.code === -1 && data.msg.indexOf('is not running') !== -1){
            if (appStartPath){
                fetch(appStartPath,{
                    method : 'GET'
                })
                .then( response => response.json() )
                .then( success => {
                    if (success)
                        me.subscribeMe();
                });
            }
        }
        else if (data.code === 0 && data.type === 'response' && data.reqType === 'subscribe' && data.msg ==='ok' && onSubscribe && typeof onSubscribe === 'function'){
            onSubscribe();
        }
        // pass to our onMessage function we passed in
        if (onMessage && typeof onMessage === 'function'){
            onMessage(data);
        }
    };

    this.ws.onerror = function(e){
        // console.log('onerror',e);
    };

    this.ws.onclose = function(e){
        // console.log('close',e);
    };

    this.subscribeMe = function(){
        if (this.ws.readyState === this.ws.OPEN)
            this.ws.send(JSON.stringify(this.subscribe));
    }

    this.unsubscribeMe = function(){
        if (this.ws.readyState === this.ws.OPEN)
            this.ws.send(JSON.stringify(this.unsubscribe));
    }

    this.publish = function(value,customOptions){
        var theCustomOptions = customOptions || {};
         var obj = Object.assign({},this.message),
             publish = value !== '';
         if (publish){
            obj.data = value;
            // add custom options
            for (let key of Object.keys(theCustomOptions))
                obj.customOptions[key] = theCustomOptions[key];
            // send message
            this.ws.send(JSON.stringify(obj));
        }
        return publish;
    }
}