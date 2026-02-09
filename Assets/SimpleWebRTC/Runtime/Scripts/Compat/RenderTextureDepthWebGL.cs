#if UNITY_WEBGL && !UNITY_EDITOR
namespace Unity.WebRTC
{
    /// <summary>
    /// WebGL stub for Unity.WebRTC.RenderTextureDepth so serialized fields
    /// remain consistent across editor and player builds.
    /// </summary>
    public enum RenderTextureDepth
    {
        Depth16 = 16,
        Depth24 = 24,
        Depth32 = 32,
    }
}
#endif
