//==============================================================================
// MIDIクライアント
//==============================================================================
var client_io = require('./client_io');
var mididevs  = require('./mididevices');
var midiconv  = require('./midiconverter');

var host;
var g_midiDevs;

module.exports = {
  type: "midi",
  createInput: function(name){
    var input = client_io(this.type, name);
    input.decodeMessage = function(msg){
      var buf = midiconv.midi2obj(msg);
      return buf;
    };
    return input;
  },
  createOutput: function(name, emitter){
    var output = client_io(this.type, name);
    output.sendMessage = function(msg){
      if(emitter){
          emitter(msg);
      }
    };
    output.encodeMessage = function(buf){
      var msg = midiconv.obj2midi(buf);
      return msg;
    };
    return(output);
  },
  //createInput: ClientMidi,
  //createOutput: ClientMidi,

  init: function(hostAPI){
    host = hostAPI;
    g_midiDevs  = mididevs.MidiDevices(
      onAddNewMidiInput.bind(this),
      onDeleteMidiInput.bind(this),
      onAddNewMidiOutput.bind(this),
      onDeleteMidiOutput.bind(this)
    );
  },
}

// 新規MIDI入力デバイスの登録
function onAddNewMidiInput(midiIn, name){
  // ネットワークに登録
  console.log("MIDI Input [" + name + "] connected.");
  var input = this.createInput(name);
  var inputId  = host.addInput(input);
  host.updateList(); // クライアントのネットワーク表示更新

  // コールバックを作る(影でinputIdをキャプチャする)
  return (function(deltaTime, message) {
    // The message is an array of numbers corresponding to the MIDI bytes:
    //   [status, data1, data2]
    // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
    // information interpreting the messages.
    var msg = {'msg': message, 'delta': deltaTime};

    // if (message.length != 1 || message[0] != 0xF8) console.log(msg); // log

    host.deliverMessage(inputId, message); // 配信
  }).bind(this);
}

// MIDI入力デバイスの切断通知
function onDeleteMidiInput(midiIn, name){
  console.log("MIDI Input [" + name + "] disconnected.");
  host.deleteInput(this.type, name);
  host.updateList(); // クライアントのネットワーク表示更新
}

// 新規MIDI出力デバイスの登録
function onAddNewMidiOutput(midiOut, name){
  // ネットワークに登録
  console.log("MIDI Output [" + name + "] connected.");
  var output = this.createOutput(name, function(msg){
    //verboseLog("[sent to midi client]", "[" + msg.join(", ") + "]")
    g_midiDevs.outputs[name].sendMessage(msg);
  }.bind(this));
  host.addOutput(output);
  host.updateList(); // クライアントのネットワーク表示更新
}

// MIDI出力デバイスの切断通知
function onDeleteMidiOutput(midiOut, name){
  console.log("MIDI Output [" + name + "] disconnected.");
  host.deleteOutput(this.type, name);
  host.updateList(); // クライアントのネットワーク表示更新
}
