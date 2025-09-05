import { useState, useEffect, useRef } from 'react';
import { personalizeContent, SAMPLE_SCENES } from '../data/testStoryContent';

export default function LayoutTest() {
  const [scenario, setScenario] = useState('mobile-reading');
  const [contentType, setContentType] = useState<keyof typeof SAMPLE_SCENES>('medium');
  const [childName, setChildName] = useState('Emma');
  const [textScale, setTextScale] = useState(1.0);
  const [storyVisible, setStoryVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(4); // minutes - for testing
  const menuRef = useRef<HTMLDivElement>(null);

  const scene = SAMPLE_SCENES[contentType];
  const isMobile = scenario.includes('mobile');
  const showChoices = scenario.includes('choices');
  
  const personalizedTitle = personalizeContent(scene.title, childName);
  const personalizedText = personalizeContent(scene.text, childName);
  const personalizedSceneTitle = scene.sceneTitle ? personalizeContent(scene.sceneTitle, childName) : null;

  const handleScaleChange = (delta: number) => {
    const newScale = Math.min(1.75, Math.max(0.75, textScale + delta));
    setTextScale(newScale);
  };

  const handleMenuItemClick = () => {
    setMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Simple Controls */}
      <div className="bg-gray-800 p-3 rounded mb-4 text-white">
        <div className="flex gap-4 text-sm">
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} className="bg-gray-700 p-1 rounded">
            <option value="mobile-reading">Mobile Reading</option>
            <option value="mobile-choices">Mobile Choices</option>
            <option value="desktop-reading">Desktop Reading</option>
          </select>
          <select value={contentType} onChange={(e) => setContentType(e.target.value as keyof typeof SAMPLE_SCENES)} className="bg-gray-700 p-1 rounded">
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
          <input value={childName} onChange={(e) => setChildName(e.target.value)} className="bg-gray-700 p-1 rounded w-20" />
          <span className="text-white">Scale: {textScale.toFixed(1)}x</span>
        </div>
      </div>

      {/* Test Frame */}
      <div className={`
        ${isMobile ? 'w-[375px] h-[812px]' : 'w-[1024px] h-[768px]'}
        mx-auto border border-gray-600 rounded-lg overflow-hidden bg-black relative
        test-frame-container
      `}
      style={{
        ['--test-mobile-text-base' as string]: isMobile ? '18px' : '22px',
        ['--test-mobile-line-height' as string]: isMobile ? '1.6' : '1.7',
        ['--story-text-scale' as string]: textScale.toString()
      }}
      >
        
        {/* Story Title - Top Left Outside Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <h1 className="text-white font-bold text-lg" style={{ fontFamily: 'Fraunces, serif', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {personalizedTitle}
          </h1>
        </div>

        {/* Video Areas */}
        <div className={`
          absolute inset-0 grid gap-1
          ${isMobile ? 'grid-cols-1 grid-rows-[1fr_0.8fr]' : 'grid-cols-2 grid-rows-1'}
        `}>
          <div className="bg-blue-600 flex items-center justify-center text-white font-bold">
            👂 Remote (Child)
          </div>
          <div className="bg-green-600 flex items-center justify-center text-white font-bold">
            📹 Local (Reader)
          </div>
        </div>

        {/* Story Overlay - Use your actual CSS classes */}
        {storyVisible && (
          <div className="story-overlay">
            <div className="story-content">
              {/* Scene Title - Blue, smaller than scene text */}
              {personalizedSceneTitle && (
                <h2 className="text-blue-400 font-semibold mb-3" 
                    style={{ 
                      fontSize: `calc(var(--test-mobile-text-base, 18px) * var(--story-text-scale, 1) * 0.9)`,
                      lineHeight: '1.4'
                    }}>
                  {personalizedSceneTitle}
                </h2>
              )}
              
              {/* Scene Text */}
              <div className="story-text">
                {personalizedText.split('\n').map((line, i) => (
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
                <button 
                  className="text-control-btn" 
                  onClick={() => setStoryVisible(false)}
                  title="Hide story text"
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  ▼
                </button>
                <button 
                  className="text-control-btn" 
                  onClick={() => handleScaleChange(-0.1)}
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  −
                </button>
                <span className="text-xs mx-2 text-green-400 font-mono">{textScale.toFixed(1)}x</span>
                <button 
                  className="text-control-btn" 
                  onClick={() => handleScaleChange(0.1)}
                  style={{ pointerEvents: 'auto', zIndex: 1000 }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Show Story Button (when hidden) */}
        {!storyVisible && (
          <div className="absolute bottom-4 left-4 z-10">
            <button 
              className="text-control-btn bg-black bg-opacity-70 text-white"
              onClick={() => setStoryVisible(true)}
              title="Show story text"
              style={{ pointerEvents: 'auto', zIndex: 1000, padding: '12px 16px' }}
            >
              ▲
            </button>
          </div>
        )}

        {/* Menu Button */}
        <button 
          className="menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        {/* Time Remaining (when < 5 min) */}
        {timeRemaining < 5 && (
          <div className="absolute top-16 left-4 z-10 bg-red-600 text-white px-2 py-1 rounded text-sm font-mono">
            {timeRemaining}:00
          </div>
        )}

        {/* Menu Panel */}
        {menuOpen && (
          <div 
            ref={menuRef}
            className="absolute top-4 right-4 z-20 bg-gray-800 text-white rounded-lg shadow-lg p-4 min-w-48"
          >
            <div className="space-y-3">
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                📚 Open Library
              </button>
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                📧 Send Invite
              </button>
              <hr className="border-gray-600" />
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                🎤 Toggle Microphone
              </button>
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                📹 Toggle Camera
              </button>
              <hr className="border-gray-600" />
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                👥 Presence Status
              </button>
              <button 
                className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded flex items-center gap-2"
                onClick={() => {
                  setTimeRemaining(timeRemaining - 1);
                  handleMenuItemClick();
                }}
              >
                ⏰ Time: {timeRemaining}:00 remaining
              </button>
              <hr className="border-gray-600" />
              <button 
                className="w-full text-left px-3 py-2 hover:bg-red-700 bg-red-600 rounded flex items-center gap-2"
                onClick={handleMenuItemClick}
              >
                👋 Leave Room
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen Button - Bottom Left, Always On Top */}
        <button 
          className="absolute bottom-4 right-4 z-1001 w-12 h-12 bg-black bg-opacity-70 text-white rounded-full flex items-center justify-center hover:bg-opacity-90 transition-all"
          title="Toggle Fullscreen"
        >
          ⛶
        </button>
        
        {/* Info */}
        <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 p-1 rounded">
          {scenario} | Lines: {personalizedText.split('\n').filter(l => l.trim()).length}
        </div>
      </div>
    </div>
  );
}