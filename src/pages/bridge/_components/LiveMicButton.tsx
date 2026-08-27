import { useState, useRef, useCallback, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type MicStatus =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "listening"
  | "speaking"
  | "processing"
  | "error";

type LiveMicButtonProps = {
  /** Called each time a speech segment is finalized with its text */
  onTranscript: (text: string) => void;
  /** Whether parent is busy (e.g. AI is parsing) — disables mic */
  disabled?: boolean;
};

// ─── Sound wave animation bars ────────────────────────────────────────────────

function SoundWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          animate={
            active
              ? { scaleY: [0.3, 1, 0.3], opacity: [0.6, 1, 0.6] }
              : { scaleY: 0.3, opacity: 0.3 }
          }
          transition={
            active
              ? { duration: 0.7, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }
              : {}
          }
          className="w-[3px] rounded-full bg-current origin-center"
          style={{ height: "14px" }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LiveMicButton({ onTranscript, disabled }: LiveMicButtonProps) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [liveText, setLiveText] = useState("");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getToken = useAction(api.ai.realtimeToken.getRealtimeToken);

  // ── Connect ──────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setStatus("requesting-permission");
    setLiveText("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 24000 },
      });
      streamRef.current = stream;
    } catch {
      setStatus("error");
      toast.error("Microphone access denied. Please allow mic access and try again.");
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    let token: string;
    try {
      const result = await getToken();
      token = result.token;
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Could not get transcription token";
      toast.error(msg.includes("OPENAI_API_KEY")
        ? "Add your OPENAI_API_KEY in Settings › Secrets to enable live mic."
        : "Could not connect to speech recognition."
      );
      setStatus("idle");
      return;
    }

    // Create WebRTC peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    // Add microphone audio track
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Data channel for OpenAI Realtime API events
    const dc = pc.createDataChannel("oai-events");
    dataChannelRef.current = dc;

    dc.addEventListener("open", () => {
      setStatus("listening");

      // Configure session: transcription-only with server VAD
      const sessionUpdate = {
        type: "session.update",
        session: {
          modalities: ["text"],
          instructions: "",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 600,
          },
        },
      };
      dc.send(JSON.stringify(sessionUpdate));
    });

    dc.addEventListener("message", (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as { type: string; transcript?: string; error?: { message: string } };

        switch (event.type) {
          case "input_audio_buffer.speech_started":
            setStatus("speaking");
            break;

          case "input_audio_buffer.speech_stopped":
            setStatus("processing");
            break;

          case "conversation.item.input_audio_transcription.delta":
            // Partial — show live preview
            if (event.transcript) {
              setLiveText((prev) => prev + event.transcript);
            }
            break;

          case "conversation.item.input_audio_transcription.completed":
            // Final segment — fire callback and clear preview
            if (event.transcript?.trim()) {
              onTranscript(event.transcript.trim());
              setLiveText("");
            }
            setStatus("listening");
            break;

          case "input_audio_buffer.committed":
            setStatus("listening");
            break;

          case "error":
            console.error("Realtime API error:", event.error);
            toast.error("Transcription error: " + (event.error?.message ?? "unknown"));
            break;
        }
      } catch {
        // ignore malformed events
      }
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        disconnect();
      }
    });

    // Create SDP offer and send to OpenAI
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime-mini", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!resp.ok) {
        throw new Error(`WebRTC signaling failed: ${resp.statusText}`);
      }

      const answerSdp = await resp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      disconnect();
      toast.error("Could not establish live transcription connection.");
      console.error(err);
    }
  }, [getToken, onTranscript]);

  // ── Disconnect ───────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStatus("idle");
    setLiveText("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const isActive = status !== "idle" && status !== "error";
  const isConnecting = status === "requesting-permission" || status === "connecting";

  function handleClick() {
    if (disabled) return;
    if (isActive) {
      disconnect();
    } else {
      void connect();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1.5">
      {/* Live text preview */}
      <AnimatePresence>
        {liveText && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="px-3 py-1.5 rounded-xl bg-[#ece6d6] border border-emerald-500/30 text-[11px] text-emerald-700 font-mono leading-relaxed"
          >
            <span className="text-emerald-600 mr-1">●</span>
            {liveText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button row */}
      <button
        onClick={handleClick}
        disabled={disabled || isConnecting}
        title={isActive ? "Stop recording" : "Start live transcription"}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border cursor-pointer",
          isActive
            ? status === "speaking"
              ? "bg-green-500/20 border-green-500/40 text-green-700"
              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-700"
            : "bg-[#ece6d6] border-[#d8d0c0] text-[#9a8a72] hover:border-emerald-500/40 hover:text-emerald-700",
          (disabled || isConnecting) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isConnecting ? (
          <Loader2 size={12} className="animate-spin shrink-0" />
        ) : isActive ? (
          status === "speaking" ? (
            <Radio size={12} className="shrink-0 animate-pulse" />
          ) : (
            <MicOff size={12} className="shrink-0" />
          )
        ) : (
          <Mic size={12} className="shrink-0" />
        )}

        {/* Sound wave when speaking */}
        {status === "speaking" ? (
          <SoundWave active={true} />
        ) : (
          <span className="truncate">
            {isConnecting
              ? "Connecting..."
              : status === "listening"
              ? "Live — tap to stop"
              : status === "processing"
              ? "Transcribing..."
              : "Live Mic"}
          </span>
        )}
      </button>
    </div>
  );
}
