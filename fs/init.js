load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');

let topic = 'home/kitchen/motion-sensor';
let pir_pin = 5;

let last_state = 0;
let last_update = 0;

// We have to do this kinda stuff because our sensor is...well...sensitive.
let eventsBeforeChange = 5; // Number of times we need to see the same state before changing ours
let concurrentEvents = 0;   // Number of times we've seen the a new state

let force_update_interval = 5; // in seconds

GPIO.set_mode(pir_pin, GPIO.MODE_INPUT);

Timer.set(1000, true, function() {
  let pirVal = GPIO.read(pir_pin);
  // Check for state changes
  if(pirVal !== last_state){
    //print("PIR Triggered!");
    concurrentEvents++;
    if (concurrentEvents === eventsBeforeChange){
      last_state = pirVal;
      pushUpdate(last_state);
      concurrentEvents = 0;
    }
  }
  // State is same, reset the change counter
  else{
    concurrentEvents = 0;
  }
  // Update if we're due for one
  if (last_update + force_update_interval <= Sys.uptime()){
    pushUpdate(last_state);
  }
}, null);

function pushUpdate(state){
  let ok = MQTT.pub(topic, state ? 'true' : 'false', 1);
  print('Publish:', ok ? 'Success!' : 'Failed');
  last_update = Sys.uptime();
}

// Monitor network connectivity.
Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}, null);
