interface MockVideoContainerProps {
  scenario: string;
}

export default function MockVideoContainer({ scenario }: MockVideoContainerProps) {
  const isMobile = scenario.includes('mobile');
  const isTablet = scenario.includes('tablet');
  const isDesktop = scenario.includes('desktop');
  
  return (
    <div className={`
      video-container 
      ${isMobile ? 'test-mobile-layout' : ''}
      ${isTablet ? 'test-tablet-layout' : ''}
      ${isDesktop ? 'test-desktop-layout' : ''}
    `}>
      {/* Primary Video - Reader */}
      <div className="video-box test-primary-video">
        <div className="test-mock-video">
          <div className="test-video-content">
            <span className="test-video-label">📹 Reader (Primary)</span>
            <div className="test-video-info">
              {isMobile && "Mobile: 335×188px"}
              {isTablet && "Tablet: 485×273px"}
              {isDesktop && "Desktop: 680×383px"}
            </div>
          </div>
          
          {/* Video Controls Overlay */}
          <div className="video-controls">
            <button className="control-btn test-mic-btn" title="Microphone">
              🎤
            </button>
            <button className="control-btn test-camera-btn" title="Camera">
              📹
            </button>
          </div>
        </div>
      </div>
      
      {/* Secondary Video - Listener - Always show for mobile */}
      <div className="video-box test-secondary-video">
        <div className="test-mock-video">
          <div className="test-video-content">
            <span className="test-video-label">👂 Listener</span>
            <div className="test-video-info">
              {isMobile && "Mobile: 335×142px"}
              {isTablet && "Tablet: 485×273px"}  
              {isDesktop && "Desktop: 680×383px"}
            </div>
          </div>
          
          {/* Role Switch Button */}
          <button className="test-role-switch" title="Switch reader/listener roles">
            ⇄
          </button>
        </div>
      </div>
    </div>
  );
}