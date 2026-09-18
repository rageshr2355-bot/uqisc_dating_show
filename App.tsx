import React from 'react';
import { PollProvider, usePollContext } from './PollContext';
import { Header } from './Header';
import { AudienceView } from './AudienceView';
import { StageDisplayView } from './StageDisplayView';
import { HostControls } from './HostControls';
import { EditQuestionModal } from './EditQuestionModal';
import { JoinQrCodeModal } from './JoinQrCodeModal';
import { StageCornerQr } from './StageCornerQr';
import { AdminGate } from './AdminGate';
import { ConfessionModal } from './ConfessionModal';
import { Heart, Tv, Sliders, LogOut } from 'lucide-react';

function AppContent() {
  const { activeView, setActiveView, isAdmin, isAdminCheckPending, logoutAdmin } = usePollContext();

  const isAdminOnlyView = activeView === 'stage' || activeView === 'host';

  // Stage & Host are the show's controls — gate them behind the admin
  // passphrase. The Audience Pad (what the QR code links to) never hits
  // this branch at all, so scanning it always goes straight through.
  if (isAdminOnlyView && !isAdmin) {
    // Briefly wait for the one-time "is my stored token still valid?" check
    // on load so an already-logged-in admin doesn't flash the gate screen.
    if (isAdminCheckPending) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#580a14] text-pink-200 text-sm">
          Loading...
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col bg-[#580a14] text-pink-50">
        <AdminGate view={activeView as 'stage' | 'host'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#580a14] text-pink-50 selection:bg-rose-600 selection:text-white relative">
      {/* Actual Scannable Join QR Code Modal */}
      <JoinQrCodeModal />

      {/* Host Question & Text Edit Modal */}
      <EditQuestionModal />

      {/* Anonymous Confession Submission (public, always mounted) */}
      <ConfessionModal />

      {/* Main Top Bar with Jab We Matched Branding */}
      <Header />

      {/* Main View Container */}
      <main className="flex-1">
        {activeView === 'audience' && <AudienceView />}
        {activeView === 'stage' && isAdmin && (
          <>
            <StageDisplayView />
            <StageCornerQr />
          </>
        )}
        {activeView === 'host' && isAdmin && <HostControls />}
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-900/50 bg-[#30030a] py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-pink-200/80">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <Heart className="w-4 h-4 text-pink-300 fill-pink-300 animate-heart-thump" />
            <span className="font-script text-base text-pink-200">jab we</span>
            <span className="font-display font-black text-pink-100">
              MATCHED
            </span>
            <span className="text-pink-400/40">•</span>
            <span className="text-pink-200 font-medium">Live audience polling</span>
          </div>

          {/* Stage & Host links only ever appear once the admin passphrase
              has been entered. A QR-code visitor never sees them. */}
          {isAdmin && (
            <div className="flex items-center gap-4 text-xs">
                <button
                  onClick={() => setActiveView('stage')}
                  className={`hover:text-white transition-colors flex items-center gap-1 ${
                    activeView === 'stage' ? 'text-white font-bold underline' : 'text-pink-300/80'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Stage Screen</span>
                </button>
                <span className="text-pink-400/30">|</span>
                <button
                  onClick={() => setActiveView('host')}
                  className={`hover:text-white transition-colors flex items-center gap-1 ${
                    activeView === 'host' ? 'text-white font-bold underline' : 'text-pink-300/80'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Host Console</span>
                </button>
                <span className="text-pink-400/30">|</span>
                <button
                  onClick={() => logoutAdmin()}
                  className="hover:text-white transition-colors flex items-center gap-1 text-pink-300/80"
                  title="Log out of admin access on this device"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Admin</span>
                </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <PollProvider>
      <AppContent />
    </PollProvider>
  );
}

export default App;

