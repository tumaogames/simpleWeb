#if UNITY_WEBGL && !UNITY_EDITOR
#if !USE_NATIVEWEBSOCKET
using Meta.Net.NativeWebSocket;
#else
using NativeWebSocket;
#endif
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.UI;

namespace SimpleWebRTC {
    public class WebRTCManager {
        public event Action<WebSocketState> OnWebSocketConnection;
        public event Action OnWebRTCConnection;
        public event Action<string> OnDataChannelConnection;
        public event Action<string> OnDataChannelMessageReceived;
        public event Action OnVideoStreamEstablished;
        public event Action OnAudioStreamEstablished;

        public bool IsWebSocketConnected { get; private set; }
        public bool IsWebSocketConnectionInProgress { get; private set; }
        public Texture ImmersiveVideoTexture { get; private set; }

        public Dictionary<string, RawImage> VideoReceivers = new Dictionary<string, RawImage>();
        public Dictionary<string, AudioSource> AudioReceivers = new Dictionary<string, AudioSource>();

        private readonly string localPeerId;
        private readonly string stunServerAddress;
        private readonly WebRTCConnection connectionGameObject;
        private WebRTCWebGLCallbacks callbacks;

        [DllImport("__Internal")] private static extern void SWR_Init();
        [DllImport("__Internal")] private static extern void SWR_SetUnityReceiver(string gameObjectName);
        [DllImport("__Internal")] private static extern void SWR_SetStunServer(string stunUrl);
        [DllImport("__Internal")] private static extern void SWR_Connect(string wsUrl, string peerId, int isSender, int isReceiver, int useAudio, int useVideo, int useData);
        [DllImport("__Internal")] private static extern void SWR_Disconnect();
        [DllImport("__Internal")] private static extern void SWR_SendWebSocketText(string message);
        [DllImport("__Internal")] private static extern void SWR_SendData(string message);
        [DllImport("__Internal")] private static extern void SWR_SendDataToPeer(string peerId, string message);
        [DllImport("__Internal")] private static extern void SWR_StartAudio();
        [DllImport("__Internal")] private static extern void SWR_StopAudio();
        [DllImport("__Internal")] private static extern void SWR_StartVideo();
        [DllImport("__Internal")] private static extern void SWR_StopVideo();

        public WebRTCManager(string localPeerId, string stunServerAddress, WebRTCConnection connectionObject) {
            this.localPeerId = localPeerId;
            this.stunServerAddress = stunServerAddress;
            this.connectionGameObject = connectionObject;

            EnsureCallbacks();
            SWR_Init();
            SWR_SetUnityReceiver(callbacks.gameObject.name);

            if (!string.IsNullOrEmpty(stunServerAddress)) {
                SWR_SetStunServer(stunServerAddress);
            }
        }

        private void EnsureCallbacks() {
            if (callbacks != null) return;
            var go = new GameObject("SimpleWebRTCWebGLCallbacks");
            UnityEngine.Object.DontDestroyOnLoad(go);
            callbacks = go.AddComponent<WebRTCWebGLCallbacks>();
            callbacks.Init(this);
        }

        public void Connect(string webSocketUrl, bool useHTTPHeader, bool isVideoAudioSender, bool isVideoAudioReceiver) {
            IsWebSocketConnectionInProgress = true;
            SWR_Connect(webSocketUrl, localPeerId, isVideoAudioSender ? 1 : 0, isVideoAudioReceiver ? 1 : 0, 1, 1, 1);
        }

        public void CloseWebRTC() {
            SWR_Disconnect();
        }

        public void CloseWebSocket() {
            SWR_Disconnect();
        }

        public void SendViaDataChannel(string message) {
            SWR_SendData(message);
        }

        public void SendViaDataChannel(string targetPeerId, string message) {
            SWR_SendDataToPeer(targetPeerId, message);
        }

        public void SendWebSocketTestMessage(string message) {
            SWR_SendWebSocketText(message);
        }

        public void AddVideoTrack() {
            SWR_StartVideo();
        }

        public void RemoveVideoTrack() {
            SWR_StopVideo();
        }

        public void AddAudioTrack() {
            SWR_StartAudio();
        }

        public void RemoveAudioTrack() {
            SWR_StopAudio();
        }

        public void StartAudioTransmission() {
            SWR_StartAudio();
        }

        public void StopAudioTransmission() {
            SWR_StopAudio();
        }

        public void StartVideoTransmission() {
            SWR_StartVideo();
        }

        public void StopVideoTransmission() {
            SWR_StopVideo();
        }

        public void InstantiateWebRTC() {
            // WebGL manager handles negotiation internally.
        }

        public void DispatchMessageQueue() {
            // no-op for WebGL
        }

        public void HandleWebSocketState(string state) {
            var isOpen = string.Equals(state, "Open", StringComparison.OrdinalIgnoreCase);
            IsWebSocketConnected = isOpen;
            IsWebSocketConnectionInProgress = false;
            OnWebSocketConnection?.Invoke(isOpen ? WebSocketState.Open : WebSocketState.Closed);
        }

        public void HandleWebRTCConnected(string peerId) {
            OnWebRTCConnection?.Invoke();
        }

        public void HandleDataChannelConnected(string peerId) {
            OnDataChannelConnection?.Invoke(peerId);
        }

        public void HandleDataChannelMessage(string message) {
            OnDataChannelMessageReceived?.Invoke(message);
        }

        public void HandleRemoteAudio(string peerId) {
            OnAudioStreamEstablished?.Invoke();
        }

        public void HandleRemoteVideo(string peerId) {
            OnVideoStreamEstablished?.Invoke();
        }
    }
}
#endif
