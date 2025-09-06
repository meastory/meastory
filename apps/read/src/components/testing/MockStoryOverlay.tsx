import { personalizeContent } from '../../data/testStoryContent';

interface MockStoryOverlayProps {
  scene: {
    title: string;
    text: string;
    choices: Array<{ label: string; nextSceneId?: string }>;
  };
  scenario: string;
  childName?: string;
  textScale?: number;
}

export default function MockStoryOverlay({ 
  scene, 
  scenario, 
  childName = "Emma",
  textScale = 1.0 
}: MockStoryOverlayProps) {
  const showChoices = scenario.includes('choices') || scene.choices.length >= 1;
  const isMobile = scenario.includes('mobile');
  
  // Personalize the content
  const personalizedTitle = personalizeContent(scene.title, childName);
  const personalizedText = personalizeContent(scene.text, childName);
  
  // Split text into lines and handle paragraph breaks
  const textLines = personalizedText.split('\n');

  return (
    <div className="story-overlay">
      <div className="story-content">
        {/* Story Title */}
        <h1 className="story-title test-story-title">
          {personalizedTitle}
        </h1>
        
        {/* Scene Text */}
        <div className="story-text test-story-text">
          {textLines.map((line, i) => (
            <div 
              key={i} 
              className={`test-story-line ${line.trim() === '' ? 'test-paragraph-break' : ''}`}
            >
              {line.trim() === '' ? '\u00A0' : line}
            </div>
          ))}
        </div>

        {/* Choice Buttons */}
        {showChoices && (
          <div className={`story-choices test-story-choices ${isMobile ? 'test-mobile-choices' : 'test-desktop-choices'}`}>
            {scene.choices.map((choice, i) => (
              <button 
                key={i} 
                className="story-choice test-choice-button"
                data-choice-index={i}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {/* Text Size Controls */}
        <div className="text-controls test-text-controls">
          <button className="text-control-btn test-text-smaller" title="Decrease text size">
            −
          </button>
          <span className="test-scale-indicator">{textScale.toFixed(1)}x</span>
          <button className="text-control-btn test-text-larger" title="Increase text size">
            +
          </button>
        </div>
        
        {/* Content Stats for Testing */}
        <div className="test-content-stats">
          <small>
            Lines: {textLines.filter(l => l.trim() !== '').length} | 
            Chars: {personalizedText.length} | 
            Choices: {scene.choices.length}
          </small>
        </div>
      </div>
    </div>
  );
}