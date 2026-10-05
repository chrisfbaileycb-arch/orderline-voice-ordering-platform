import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

type MicStatus =
  | "idle"
  | "requesting-permission"
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setStatus("idle");
    setLiveText("");
  }, []);

  const connect = useCallback(() => {
    setStatus("requesting-permission");
    setLiveText("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setStatus("idle");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onstart = () => {
        setStatus("listening");
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setStatus("speaking");
          setLiveText(interim);
        }

        if (final.trim()) {
          setStatus("processing");
          onTranscript(final.trim());
          setLiveText("");
          setTimeout(() => setStatus("listening"), 300);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          toast.error(`Mic error: ${event.error}`);
          disconnect();
        }
      };

      recognition.onend = () => {
        if (status === "listening" || status === "speaking") {
          // Restart if still active
          try {
            recognition.start();
          } catch {
            disconnect();
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error(err);
      toast.error("Could not start microphone.");
      setStatus("idle");
    }
  }, [disconnect, onTranscript, status]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const isActive = status !== "idle" && status !== "error";
  const isConnecting = status === "requesting-permission";

  function handleClick() {
    if (disabled) return;
    if (isActive) {
      disconnect();
    } else {
      connect();
    }
  }

  return (
    <div className="relative flex items-center">
      {/* Live transcript tooltip bubble while speaking */}
      <AnimatePresence>
        {liveText && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#1c1812] text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-white/10 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              HEARING...
            </div>
            <p className="line-clamp-2 italic text-[#d4cbba] font-serif">"{liveText}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={isActive ? "Stop microphone" : "Start live microphone"}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium font-mono border transition-all duration-200 select-none",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
          // Idle state
          status === "idle" &&
            "bg-[#faf6ed] hover:bg-[#ece6d6] text-[#4d3b24] border-[#d8d0c0] hover:border-[#b8a890]",
          // Connecting state
          isConnecting &&
            "bg-amber-500/15 text-amber-700 border-amber-500/40 animate-pulse",
          // Listening (open mic, waiting for speech)
          status === "listening" &&
            "bg-emerald-500/15 text-emerald-700 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
          // Speaking (audio detected)
          status === "speaking" &&
            "bg-emerald-600 text-white border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.4)]",
          // Processing
          status === "processing" &&
            "bg-purple-500/15 text-purple-700 border-purple-500/40",
          // Error
          status === "error" &&
            "bg-red-500/15 text-red-700 border-red-500/40"
        )}
      >
        {/* Pulsing beacon dot when active */}
        {isActive && !isConnecting && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
          </span>
        )}

        {/* Icon */}
        {isConnecting ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isActive ? (
          <Radio size={13} className={status === "speaking" ? "animate-pulse" : ""} />
        ) : (
          <Mic size={13} />
        )}

        {/* Label */}
        <span>
          {status === "idle" && "Live Mic"}
          {status === "requesting-permission" && "Allow Mic..."}
          {status === "listening" && "Listening..."}
          {status === "speaking" && "Hearing you..."}
          {status === "processing" && "Parsing..."}
          {status === "error" && "Mic Error"}
        </span>

        {/* Waveform bars when listening or speaking */}
        {isActive && !isConnecting && (
          <SoundWave active={status === "speaking"} />
        )}

        {/* Stop button X when live */}
        {isActive && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              disconnect();
            }}
            className="ml-0.5 hover:opacity-75 transition-opacity"
            title="Stop listening"
          >
            <MicOff size={11} />
          </span>
        )}
      </button>
    </div>
  );
}
