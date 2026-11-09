export const speakUrdu = async (text: string) => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return;
    
    const { audio } = await response.json();
    
    // Play audio
    const audioContent = new Audio(`data:audio/wav;base64,${audio}`);
    audioContent.play();
  } catch (err) {
    console.error('Voice guidance error:', err);
  }
};
