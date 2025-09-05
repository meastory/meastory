interface MockControlsProps {
  scenario: string;
}

export default function MockControls({ scenario }: MockControlsProps) {
  return (
    <>
      {/* Menu Button - Top Right */}
      <button className="menu-btn test-menu-btn" title="Open menu">
        ☰
      </button>
      
      {/* Fullscreen Button - Top Right */}
      <div className="fixed top-6 right-16 z-[100]">
        <button className="control-btn test-fullscreen-btn" title="Toggle fullscreen">
          ⛶
        </button>
      </div>
      
      {/* Library Button - Top Left */}
      <div className="fixed top-6 left-6 z-[100]">
        <button className="control-btn test-library-btn" title="Open story library">
          📚
        </button>
      </div>
      
      {/* Leave Room Button - Bottom Left (when in room) */}
      <div className="fixed bottom-6 left-6 z-[100]">
        <button className="test-leave-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm" title="Leave room">
          👋 Leave
        </button>
      </div>
      
      {/* Testing Info Panel */}
      <div className="test-scenario-info fixed bottom-6 right-6 z-[100] bg-gray-800 text-white p-3 rounded text-xs">
        <div>Scenario: <strong>{scenario}</strong></div>
        <div>Screen: <span className="test-screen-size"></span></div>
      </div>
    </>
  );
}