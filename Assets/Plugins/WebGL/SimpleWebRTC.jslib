mergeInto(LibraryManager.library, {
  SWR_Init: function () {
    window.SimpleWebRTC = window.SimpleWebRTC || {};
    var swr = window.SimpleWebRTC;
    swr.ws = swr.ws || null;
    swr.unityReceiver = swr.unityReceiver || null;
    swr.localPeerId = swr.localPeerId || "";
    swr.isSender = swr.isSender !== undefined ? swr.isSender : true;
    swr.isReceiver = swr.isReceiver !== undefined ? swr.isReceiver : true;
    swr.useData = swr.useData !== undefined ? swr.useData : true;
    swr.useAudio = swr.useAudio !== undefined ? swr.useAudio : true;
    swr.useVideo = swr.useVideo !== undefined ? swr.useVideo : true;
    swr.iceServers = swr.iceServers || [];
    swr.peerConnections = swr.peerConnections || {};
    swr.dataChannels = swr.dataChannels || {};
    swr.receiverDataChannels = swr.receiverDataChannels || {};
    swr.localStream = swr.localStream || null;
    swr.localAudioTrack = swr.localAudioTrack || null;
    swr.localVideoTrack = swr.localVideoTrack || null;
    swr.sendToUnity = function (method, payload) {
      try {
        if (swr.unityReceiver) {
          SendMessage(swr.unityReceiver, method, payload || "");
        }
      } catch (e) {
        // ignore
      }
    };
    swr.log = function (msg) {
      swr.sendToUnity("WebGL_OnLog", msg);
    };
    swr.error = function (msg) {
      swr.sendToUnity("WebGL_OnError", msg);
    };
  },

  SWR_SetUnityReceiver: function (goPtr) {
    var goName = UTF8ToString(goPtr);
    window.SimpleWebRTC.unityReceiver = goName;
  },

  SWR_SetStunServer: function (stunPtr) {
    var stunUrl = UTF8ToString(stunPtr);
    if (stunUrl && stunUrl.length > 0) {
      window.SimpleWebRTC.iceServers = [{ urls: [stunUrl] }];
    }
  },

  SWR_Connect: function (urlPtr, peerIdPtr, isSender, isReceiver, useAudio, useVideo, useData) {
    var wsUrl = UTF8ToString(urlPtr);
    var peerId = UTF8ToString(peerIdPtr);
    var swr = window.SimpleWebRTC;

    swr.localPeerId = peerId;
    swr.isSender = !!isSender;
    swr.isReceiver = !!isReceiver;
    swr.useAudio = !!useAudio;
    swr.useVideo = !!useVideo;
    swr.useData = !!useData;

    if (swr.ws) {
      try { swr.ws.close(); } catch (e) {}
      swr.ws = null;
    }

    swr.ws = new WebSocket(wsUrl);
    swr.ws.onopen = function () {
      swr.sendToUnity("WebGL_OnWebSocketState", "Open");
      swr.log("WebSocket opened.");
      swr.sendSignal("NEWPEER", "ALL", "New peer " + swr.localPeerId);
    };
    swr.ws.onerror = function (e) {
      swr.error("WebSocket error: " + e);
    };
    swr.ws.onclose = function () {
      swr.sendToUnity("WebGL_OnWebSocketState", "Closed");
      swr.log("WebSocket closed.");
    };
    swr.ws.onmessage = function (evt) {
      swr.handleSignal(evt.data);
    };
  },

  SWR_Disconnect: function () {
    var swr = window.SimpleWebRTC;
    if (swr.ws) {
      try { swr.ws.close(); } catch (e) {}
      swr.ws = null;
    }
    for (var id in swr.peerConnections) {
      try { swr.peerConnections[id].close(); } catch (e) {}
    }
    swr.peerConnections = {};
    swr.dataChannels = {};
    swr.receiverDataChannels = {};
  },

  SWR_SendWebSocketText: function (msgPtr) {
    var swr = window.SimpleWebRTC;
    var msg = UTF8ToString(msgPtr);
    if (swr.ws && swr.ws.readyState === WebSocket.OPEN) {
      swr.ws.send(msg);
    }
  },

  SWR_SendData: function (msgPtr) {
    var swr = window.SimpleWebRTC;
    var msg = UTF8ToString(msgPtr);
    for (var id in swr.dataChannels) {
      var ch = swr.dataChannels[id];
      if (ch && ch.readyState === "open") {
        ch.send(msg);
      }
    }
  },

  SWR_SendDataToPeer: function (peerIdPtr, msgPtr) {
    var swr = window.SimpleWebRTC;
    var peerId = UTF8ToString(peerIdPtr);
    var msg = UTF8ToString(msgPtr);
    var ch = swr.dataChannels[peerId];
    if (ch && ch.readyState === "open") {
      ch.send(msg);
    }
  },

  SWR_StartAudio: function () {
    var swr = window.SimpleWebRTC;
    if (swr.localAudioTrack) {
      swr.localAudioTrack.enabled = true;
      swr.renegotiateAll();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(function (stream) {
        swr.localAudioTrack = stream.getAudioTracks()[0];
        if (!swr.localStream) swr.localStream = new MediaStream();
        swr.localStream.addTrack(swr.localAudioTrack);
        swr.addLocalTracksToAll();
        swr.renegotiateAll();
      })
      .catch(function (err) {
        swr.error("getUserMedia audio failed: " + err);
      });
  },

  SWR_StopAudio: function () {
    var swr = window.SimpleWebRTC;
    if (swr.localAudioTrack) {
      swr.localAudioTrack.enabled = false;
    }
  },

  SWR_StartVideo: function () {
    var swr = window.SimpleWebRTC;
    if (swr.localVideoTrack) {
      swr.localVideoTrack.enabled = true;
      swr.renegotiateAll();
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      .then(function (stream) {
        swr.localVideoTrack = stream.getVideoTracks()[0];
        if (!swr.localStream) swr.localStream = new MediaStream();
        swr.localStream.addTrack(swr.localVideoTrack);
        swr.addLocalTracksToAll();
        swr.renegotiateAll();
      })
      .catch(function (err) {
        swr.error("getUserMedia video failed: " + err);
      });
  },

  SWR_StopVideo: function () {
    var swr = window.SimpleWebRTC;
    if (swr.localVideoTrack) {
      swr.localVideoTrack.enabled = false;
    }
  }
});

// Helper functions added to SimpleWebRTC namespace
(function () {
  function parseBool(v) {
    return v === true || v === "true" || v === "True" || v === 1;
  }

  function getConnectionCount(swr) {
    return Object.keys(swr.peerConnections).length;
  }

  window.SimpleWebRTC = window.SimpleWebRTC || {};

  window.SimpleWebRTC.sendSignal = function (type, receiverPeerId, message) {
    var swr = window.SimpleWebRTC;
    if (!swr.ws || swr.ws.readyState !== WebSocket.OPEN) return;
    var count = getConnectionCount(swr);
    var payload = type + "|" + swr.localPeerId + "|" + receiverPeerId + "|" + message + "|" + count + "|" + swr.isSender;
    swr.ws.send(payload);
  };

  window.SimpleWebRTC.addLocalTracksToAll = function () {
    var swr = window.SimpleWebRTC;
    if (!swr.localStream) return;
    for (var id in swr.peerConnections) {
      var pc = swr.peerConnections[id];
      swr.localStream.getTracks().forEach(function (t) {
        try { pc.addTrack(t, swr.localStream); } catch (e) {}
      });
    }
  };

  window.SimpleWebRTC.renegotiateAll = function () {
    var swr = window.SimpleWebRTC;
    for (var id in swr.peerConnections) {
      swr.createAndSendOffer(id);
    }
  };

  window.SimpleWebRTC.setupDataChannel = function (peerId, channel) {
    var swr = window.SimpleWebRTC;
    channel.onopen = function () {
      swr.sendToUnity("WebGL_OnDataChannelConnected", peerId);
      swr.sendSignal("DATA", peerId, "DataChannel connected");
    };
    channel.onmessage = function (evt) {
      swr.sendToUnity("WebGL_OnDataChannelMessage", evt.data);
    };
    channel.onclose = function () {};
  };

  window.SimpleWebRTC.attachAudio = function (peerId, stream) {
    var id = "simplewebrtc-audio-" + peerId;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("audio");
      el.id = id;
      el.autoplay = true;
      el.playsInline = true;
      el.controls = false;
      document.body.appendChild(el);
    }
    el.srcObject = stream;
    el.volume = 1.0;
    var playPromise = el.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {});
    }
  };

  window.SimpleWebRTC.attachVideo = function (peerId, stream) {
    var id = "simplewebrtc-video-" + peerId;
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("video");
      el.id = id;
      el.autoplay = true;
      el.playsInline = true;
      el.controls = false;
      el.style.maxWidth = "240px";
      el.style.maxHeight = "180px";
      el.style.position = "relative";
      document.body.appendChild(el);
    }
    el.srcObject = stream;
    var playPromise = el.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () {});
    }
  };

  window.SimpleWebRTC.ensurePeerConnection = function (peerId) {
    var swr = window.SimpleWebRTC;
    if (swr.peerConnections[peerId]) return swr.peerConnections[peerId];

    var pc = new RTCPeerConnection({ iceServers: swr.iceServers });
    swr.peerConnections[peerId] = pc;

    pc.onicecandidate = function (evt) {
      if (evt.candidate) {
        var cand = {
          sdpMid: evt.candidate.sdpMid,
          sdpMLineIndex: evt.candidate.sdpMLineIndex || 0,
          candidate: evt.candidate.candidate
        };
        swr.sendSignal("CANDIDATE", peerId, JSON.stringify(cand));
      } else {
        var end = { sdpMid: "", sdpMLineIndex: 0, candidate: "" };
        swr.sendSignal("CANDIDATE", peerId, JSON.stringify(end));
      }
    };

    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        swr.sendToUnity("WebGL_OnWebRTCConnected", peerId);
        swr.sendSignal("COMPLETE", peerId, "Peerconnection completed.");
      }
    };

    pc.ontrack = function (evt) {
      var track = evt.track;
      var stream = evt.streams && evt.streams[0] ? evt.streams[0] : new MediaStream([track]);
      if (track.kind === "audio") {
        swr.attachAudio(peerId, stream);
        swr.sendToUnity("WebGL_OnRemoteAudio", peerId);
      }
      if (track.kind === "video") {
        swr.attachVideo(peerId, stream);
        swr.sendToUnity("WebGL_OnRemoteVideo", peerId);
      }
    };

    pc.ondatachannel = function (evt) {
      var ch = evt.channel;
      swr.receiverDataChannels[peerId] = ch;
      swr.setupDataChannel(peerId, ch);
    };

    if (swr.useData) {
      var dc = pc.createDataChannel(peerId);
      swr.dataChannels[peerId] = dc;
      swr.setupDataChannel(peerId, dc);
    }

    if (swr.localStream) {
      swr.localStream.getTracks().forEach(function (t) {
        try { pc.addTrack(t, swr.localStream); } catch (e) {}
      });
    }

    return pc;
  };

  window.SimpleWebRTC.createAndSendOffer = function (peerId) {
    var swr = window.SimpleWebRTC;
    var pc = swr.peerConnections[peerId];
    if (!pc) return;
    pc.createOffer()
      .then(function (offer) { return pc.setLocalDescription(offer); })
      .then(function () {
        var offerDesc = { type: pc.localDescription.type, sdp: pc.localDescription.sdp };
        swr.sendSignal("OFFER", peerId, JSON.stringify(offerDesc));
      })
      .catch(function (err) {
        swr.error("CreateOffer failed: " + err);
      });
  };

  window.SimpleWebRTC.handleSignal = function (msg) {
    var swr = window.SimpleWebRTC;
    var parts = msg.split("|");
    if (parts.length < 4) return;
    var type = parts[0];
    var sender = parts[1];
    var receiver = parts[2];
    var message = parts[3];
    var connectionCount = parts.length > 4 ? parseInt(parts[4]) : 0;
    var isSender = parts.length > 5 ? parseBool(parts[5]) : true;

    if (sender === swr.localPeerId) return;

    switch (type) {
      case "NEWPEER":
        swr.ensurePeerConnection(sender);
        swr.sendSignal("NEWPEERACK", "ALL", "New peer ACK");
        break;
      case "NEWPEERACK":
        swr.ensurePeerConnection(sender);
        if (connectionCount === getConnectionCount(swr)) {
          swr.createAndSendOffer(sender);
        }
        break;
      case "OFFER":
        if (receiver !== swr.localPeerId) return;
        var pcOffer = swr.ensurePeerConnection(sender);
        var offer = JSON.parse(message);
        pcOffer.setRemoteDescription(new RTCSessionDescription(offer))
          .then(function () { return pcOffer.createAnswer(); })
          .then(function (answer) { return pcOffer.setLocalDescription(answer); })
          .then(function () {
            var answerDesc = { type: pcOffer.localDescription.type, sdp: pcOffer.localDescription.sdp };
            swr.sendSignal("ANSWER", sender, JSON.stringify(answerDesc));
          })
          .catch(function (err) {
            swr.error("HandleOffer failed: " + err);
          });
        break;
      case "ANSWER":
        if (receiver !== swr.localPeerId) return;
        var pcAnswer = swr.peerConnections[sender];
        if (!pcAnswer) return;
        var answer = JSON.parse(message);
        pcAnswer.setRemoteDescription(new RTCSessionDescription(answer)).catch(function () {});
        break;
      case "CANDIDATE":
        if (receiver !== swr.localPeerId) return;
        var pcCand = swr.peerConnections[sender];
        if (!pcCand) return;
        try {
          var candObj = JSON.parse(message);
          if (candObj && candObj.candidate) {
            pcCand.addIceCandidate(new RTCIceCandidate(candObj));
          }
        } catch (e) {}
        break;
      case "DATA":
        if (receiver === swr.localPeerId) {
          swr.sendToUnity("WebGL_OnDataChannelConnected", sender);
        }
        break;
      case "COMPLETE":
        if (receiver === swr.localPeerId) {
          swr.sendToUnity("WebGL_OnWebRTCConnected", sender);
        }
        break;
      case "DISPOSE":
        if (swr.peerConnections[sender]) {
          try { swr.peerConnections[sender].close(); } catch (e) {}
          delete swr.peerConnections[sender];
        }
        break;
      default:
        break;
    }
  };
})();
