// components/Transcript.tsx (version corrigée)
"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";
import { VideoPlayer } from "./VideoPlayer";
import { findVideoByExactMatch } from "@/app/utils/videoMapper";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  // Filtrer seulement les messages de l'agent
  const agentMessages = transcriptItems.filter(item => 
    item.type === "MESSAGE" && item.role !== "user" && !item.isHidden
  );

  // Détecter les nouveaux messages
  const newMessages = agentMessages.filter(msg => !processedMessages.has(msg.itemId));
  const hasNewMessage = newMessages.length > 0;

  // Quand un nouveau message arrive, l'ajouter à l'animation
  useEffect(() => {
    if (hasNewMessage && !isAnimating) {
      const newMessageIndex = agentMessages.findIndex(msg => msg.itemId === newMessages[0].itemId);
      setCurrentDisplayIndex(newMessageIndex);
      setCurrentWordIndex(0);
      setCurrentWord("");
      setCurrentVideo(null);
      setIsAnimating(true);
      
      setProcessedMessages(prev => {
        const newSet = new Set(prev);
        newMessages.forEach(msg => newSet.add(msg.itemId));
        return newSet;
      });
    }
  }, [hasNewMessage, isAnimating, agentMessages, newMessages]);

  // Gérer l'affichage des vidéos
  useEffect(() => {
    if (!isAnimating || agentMessages.length === 0 || currentDisplayIndex >= agentMessages.length) {
      return;
    }

    const currentMessage = agentMessages[currentDisplayIndex];
    const targetText = currentMessage.title.replace(/\./g, "");
    const words = targetText.split(" ").filter(word => word.length > 0);

    // Si on a fini tous les mots de ce message
    if (currentWordIndex >= words.length) {
      // Attendre 1 seconde puis passer au message suivant s'il y en a un nouveau
      const timer = setTimeout(() => {
        const nextMessageIndex = currentDisplayIndex + 1;
        
        if (nextMessageIndex < agentMessages.length) {
          // Passer au message suivant
          setCurrentDisplayIndex(nextMessageIndex);
          setCurrentWordIndex(0);
          setCurrentVideo(null);
        } else {
          // Plus de messages à afficher
          setIsAnimating(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Afficher la vidéo pour le mot courant
    const currentWord = words[currentWordIndex];
    const videoFile = findVideoByExactMatch(currentWord);
    
    setCurrentWord(currentWord);
    setCurrentVideo(videoFile);
    setIsPlayingVideo(true);
    scrollToBottom();

  }, [isAnimating, agentMessages, currentDisplayIndex, currentWordIndex]); // Dépendances fixes

  // Handle video completion
  const handleVideoEnded = () => {
    setIsPlayingVideo(false);
    // Move to next word after a brief pause
    setTimeout(() => {
      setCurrentWordIndex(prev => prev + 1);
    }, 300);
  };

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-xl">
      <div className="flex flex-col flex-1 min-h-0">

        {/* Transcript Content - Centered and Large */}
        <div
          ref={transcriptRef}
          className="overflow-auto p-4 flex items-center justify-center h-full"
        >
          {/* Afficher la vidéo en cours */}
          {isAnimating && currentVideo ? (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <VideoPlayer 
                videoPath={currentVideo} 
                onEnded={handleVideoEnded}
                autoPlay={true}
              />
              
              {/* Afficher le mot en texte aussi pour référence */}
              <div className="mt-4 text-2xl text-gray-600 font-medium">
                {currentWord}
              </div>
              
              {/* Guardrail en bas du centre */}
              {currentDisplayIndex < agentMessages.length && 
               currentWordIndex >= agentMessages[currentDisplayIndex].title.replace(/\./g, "").split(" ").filter(word => word.length > 0).length && 
               agentMessages[currentDisplayIndex].guardrailResult && (
                <div className="mt-8">
                  <GuardrailChip guardrailResult={agentMessages[currentDisplayIndex].guardrailResult} />
                </div>
              )}
            </div>
          ) : agentMessages.length === 0 ? (
            // Empty state centré
            <div className="flex items-center justify-center text-gray-400 text-xl">
              No agent messages yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Transcript;