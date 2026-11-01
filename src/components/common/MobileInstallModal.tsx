import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Cloud,
  QrCode,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Live app URL for sharing and mobile access
  const appUrl =
    typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? 'https://ais-pre-vyd26f3zajj37cfl4quv23-791603188061.asia-northeast1.run.app'
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-vyd26f3zajj37cfl4quv23-791603188061.asia-northeast1.run.app';

  // Listen for native PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      handleCopy();
      alert(
        'मोबाइल में Chrome Browser खोलकर Link पेस्ट करें और 3 डॉट्स (⋮) पर क्लिक करके "Install App" या "Add to Home screen" चुनें!'
      );
    }
  };

  const handleDownloadLauncher = () => {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VyaparOne ERP Mobile Launcher</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=${appUrl}">
  <style>
    body { font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
    .card { background: #1e293b; padding: 24px; border-radius: 16px; border: 1px solid #334155; max-width: 340px; }
    a { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>VYAPAR ONE ERP</h2>
    <p>Opening live Cloud ERP Application...</p>
    <a href="${appUrl}">Open VyaparOne ERP</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VyaparOne-Mobile-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    appUrl
  )}&color=312e81`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">
                  Mobile App Download (APK / PWA)
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Live Online
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Install directly on Android mobile like a native APK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Quick Install Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-indigo-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>1-Tap Direct Mobile Install</span>
              </div>
              <p className="text-xs text-indigo-700">
                Install as a full-screen app on home screen with icon & offline support.
              </p>
            </div>
            <button
              onClick={handleNativeInstall}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Install App on Mobile</span>
            </button>
          </div>

          {/* QR Code + Public Live Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <img
                src={qrCodeUrl}
                alt="Scan to open on Mobile"
                className="w-36 h-36 rounded-md object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <p className="text-[11px] font-bold text-slate-700 mt-2 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                Scan with Phone Camera
              </p>
              <p className="text-[10px] text-slate-500">Opens directly in Mobile Chrome</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Public Live Online Link:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Link Copied to Clipboard!
                  </p>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={handleDownloadLauncher}
                  className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download App Shortcut (.html launcher)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step-by-Step Hindi & English Android Installation Instructions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Android Mobile में App / APK की तरह डाउनलोड कैसे करें:
            </h4>

            <ol className="text-xs space-y-2.5 text-slate-700 list-decimal pl-4">
              <li>
                <span className="font-semibold text-slate-900">Chrome Browser खोलें:</span> अपने
                फोन में ऊपर दी गई Public Link खोलें.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Menu खोलें:</span> Chrome के ऊपर दाईं
                तरफ दिए गए <span className="font-bold text-indigo-600">3 डॉट्स (⋮)</span> पर टैप
                करें.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Install App चुनें:</span> मेनू में से{' '}
                <span className="font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  "Install app"
                </span>{' '}
                या{' '}
                <span className="font-bold bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                  "Add to Home screen"
                </span>{' '}
                पर क्लिक करें.
              </li>
              <li>
                <span className="font-semibold text-slate-900">होम स्क्रीन पर तैयार:</span> ऐप आपके
                फोन की स्क्रीन पर एक अलग APK ऐप की तरह आइकन के साथ आ जाएगी.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Firebase Cloud Sync:</span> फोन में
                जो भी एंट्री होगी, वो रियल-टाइम में Google Cloud Database में सुरक्षित सेव रहेगी!
              </li>
            </ol>
          </div>

          {/* Cloud Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Connected to <strong>Google Cloud Firestore</strong> (`intrepid-infinity-m8p5g`). Multi-device
              live synchronization active.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Enterprise PWA Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
