# Just a little motion detection light for ESP8266

This is a Mongoose OS app written in Javascript. It uses MQTT to notify 
HomeAssistant of its state, as well as try to make the PIR sensor less sensitive 
by debouncing the input changes.

If you're interested in embedded programming, you should check out Mongoose OS, 
it has a ton of cool features! [Mongoose OS](https://mongoose-os.com/). 