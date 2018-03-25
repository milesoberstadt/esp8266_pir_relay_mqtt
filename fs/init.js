load('api_config.js');
load('api_events.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');

let motion_state_topic = 'home/kitchen/motion-sensor';
let light_state_topic = 'home/kitchen/counter-led-strip';
let relay_pin = 4;
let pir_pin = 5;

// Initial state of off
let pir_state = 0;
let light_state = 0;

// We have to do this kinda stuff because our sensor is...well...sensitive.
let eventsBeforeChange = 5; // Number of times we need to see the same state before changing ours
let concurrentEvents = 0;   // Number of times we've seen the a new state

let force_update_interval = 5; // in seconds

GPIO.set_mode(pir_pin, GPIO.MODE_INPUT);
GPIO.set_mode(relay_pin, GPIO.MODE_OUTPUT);
GPIO.set_pull(relay_pin, GPIO.PULL_UP);
// Turn the relay on by default, assume that a power cycle means that we want that light on.
GPIO.write(relay_pin, 1);

// Check the PIR sensor every second
Timer.set(1000, true, function() {
  let pirVal = GPIO.read(pir_pin);
  // Check for state changes
  if(pirVal !== pir_state){
    //print("PIR Triggered!");
    concurrentEvents++;
    if (concurrentEvents === eventsBeforeChange){
      pir_state = pirVal;
      push_pir_update(pir_state);
      concurrentEvents = 0;
    }
  }
  // State is same, reset the change counter
  else{
    concurrentEvents = 0;
  }
}, null);

// MQTT publish update loop
Timer.set(force_update_interval*1000, true, function() {
  // Update the PIR state
  push_pir_update(pir_state);
  // Update the light state
  push_light_update(light_state);
}, null);

// Listen for light changes
MQTT.sub(light_state_topic+'/set', function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  light_state = msg === 'ON' ? 1 : 0;
  GPIO.write(relay_pin, light_state);
  // Publish the change!
  push_light_update(light_state);
}, null);

function push_pir_update(state){
  let ok = MQTT.pub(motion_state_topic, state ? 'true' : 'false', 1);
  print('PIR Publish:', ok ? 'Success!' : 'Failed');
}

function push_light_update(state){
  let ok = MQTT.pub(light_state_topic, state ? 'ON' : 'OFF', 1);
  print('Light Publish:', ok ? 'Success!' : 'Failed');
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
