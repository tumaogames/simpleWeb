#if UNITY_WEBGL && !UNITY_EDITOR
using UnityEngine;

namespace SimpleWebRTC {
    public class WebRTCWebGLCallbacks : MonoBehaviour {
        private WebRTCManager manager;

        public void Init(WebRTCManager mgr) {
            manager = mgr;
        }

        public void WebGL_OnWebSocketState(string state) {
            manager?.HandleWebSocketState(state);
        }

        public void WebGL_OnWebRTCConnected(string peerId) {
            manager?.HandleWebRTCConnected(peerId);
        }

        public void WebGL_OnDataChannelConnected(string peerId) {
            manager?.HandleDataChannelConnected(peerId);
        }

        public void WebGL_OnDataChannelMessage(string message) {
            manager?.HandleDataChannelMessage(message);
        }

        public void WebGL_OnRemoteAudio(string peerId) {
            manager?.HandleRemoteAudio(peerId);
        }

        public void WebGL_OnRemoteVideo(string peerId) {
            manager?.HandleRemoteVideo(peerId);
        }

        public void WebGL_OnLog(string message) {
            SimpleWebRTCLogger.Log(message);
        }

        public void WebGL_OnError(string message) {
            SimpleWebRTCLogger.LogError(message);
        }
    }
}
#endif
