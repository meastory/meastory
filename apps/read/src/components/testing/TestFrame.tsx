import { personalizeContent } from '../../data/testStoryContent';
import type { CSSProperties } from 'react'

interface TestFrameProps {
  scenario: string;
  scene: {
    title: string;
    text: string;
    choices: Array<{ label: string; nextSceneId?: string }>;
  };
  childName: string;
  textScale: number;
}

export default function TestFrame({ scenario, scene, childName, textScale }: TestFrameProps) {
  const isMobile = scenario.includes('mobile');
  const showChoices = scenario.includes('choices');
  
  const personalizedTitle = personalizeContent(scene.title, childName);
  const personalizedText = personalizeContent(scene.text, childName);
  
  const containerStyle: CSSProperties & Record<string, string> = {
    '--story-text-scale': String(textScale),
  }

  return (
    <div className={`
      ${isMobile ? 'w-[375px] h-[812px]' : 'w-[1024px] h-[768px]'}
      mx-auto border-2 border-gray-600 rounded-lg overflow-hidden
      video-first-layout
    `}
    style={containerStyle}
    >
      
      {/* Use your ACTUAL video container class */}
      <div className="video-container">
        {/* Primary Video */}
        <div className="video-box">
          <div className="w-full h-full bg-green-600 flex items-center justify-center text-white">
            <div className="text-center">
              <div>📹 Reader</div>
              <div className="text-xs mt-1">{isMobile ? 'Mobile' : 'Desktop'}</div>
            </div>
          </div>
        </div>
        
        {/* Secondary Video - only show if not mobile or if we have room */}
        <div className="video-box">
          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white">
            <div className="text-center">
              <div>👂 Listener</div>
              <div className="text-xs mt-1">{isMobile ? 'Mobile' : 'Desktop'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Use your ACTUAL story overlay class */}
      <div className="story-overlay">
        <div className="story-content">
          <h1 className="story-title">{personalizedTitle}</h1>
          
          <div className="story-text">
            {personalizedText.split('\n').map((line: string, i: number) => (
              <div key={i}>{line || '\u00A0'}</div>
            ))}
          </div>

          {showChoices && (
            <div className="story-choices">
              {scene.choices.map((choice, i) => (
                <button key={i} className="story-choice">
                  {choice.label}
                </button>
              ))}
            </div>
          )}

          <div className="text-controls">
            <button className="text-control-btn">−</button>
            <span className="text-xs mx-2">{textScale.toFixed(1)}x</span>
            <button className="text-control-btn">+</button>
          </div>
        </div>
      </div>

      {/* Your actual menu button */}
      <button className="menu-btn">☰</button>
      
      {/* Debug info */}
      <div className="absolute bottom-2 right-2 text-xs bg-black bg-opacity-50 text-white p-1 rounded">
        {scenario}
      </div>
    </div>
  );
}