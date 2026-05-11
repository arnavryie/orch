"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  isStreaming: boolean;
}

export default function StreamingText({ text, isStreaming }: Props) {
  const [displayed, setDisplayed] = useState("");
  const [prevText, setPrevText] = useState("");

  useEffect(() => {
    if (text === prevText) return;
    const newPart = text.slice(prevText.length);
    setPrevText(text);

    // Animate new characters appearing
    let i = 0;
    const interval = setInterval(() => {
      if (i >= newPart.length) {
        clearInterval(interval);
        return;
      }
      setDisplayed((prev) => prev + newPart[i]);
      i++;
    }, 8); // 8ms per character = fast natural stream feel

    return () => clearInterval(interval);
  }, [text, prevText]);

  return (
    <div className="whitespace-pre-wrap text-[#ececec] leading-relaxed text-[15px]">
      {displayed}
      {isStreaming && (
        <motion.span
          className="inline-block w-[2px] h-[16px] bg-[#ececec] ml-[2px] align-middle"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  );
}
