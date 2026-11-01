import React, { useState } from 'react';
import { DatabaseState } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { LoginModal } from './LoginModal';
import { MobileInstallModal } from '../common/MobileInstallModal';
import { formatCurrency } from '../../utils/formatters';
import {
  Building2,
  MapPin,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
  Smartphone,
  Download,
  LogIn,
  Layers,
  ArrowRight,
  FileText,
  DollarSign,
  Users,
  Compass,
  Sparkles,
  ExternalLink,
  ChevronRight,
  QrCode,
  Lock,
} from 'lucide-react';

interface LandingPageViewProps {
  db: DatabaseState;
  onEnterERP: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ db, onEnterERP }) => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileInstallOpen, setIsMobileInstallOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { company } = db;

  const handlePortalClick = () => {
    if (isAuthenticated) {
      onEnterERP();
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const availableProperties = db.properties.filter(
    (p) =>
      p.status === 'Available' &&
      (selectedCategory === 'ALL' || p.propertyType === selectedCategory)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* 1. Public Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-md tracking-wider">
              YO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                  {company.companyName || 'Vishwas Developer'}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  RERA Registered
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                Land Promoter, Real Estate Developer & Construction Management
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#projects" className="hover:text-indigo-600 transition-colors">
              Projects
            </a>
            <a href="#properties" className="hover:text-indigo-600 transition-colors">
              Plots & Flats
            </a>
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Why Us
            </a>
            <a href="#mobile-app" className="hover:text-indigo-600 transition-colors">
              Mobile App
            </a>
            <a href="#contact" className="hover:text-indigo-600 transition-colors">
              Contact
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileInstallOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Mobile App (APK)</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEnterERP}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-98"
                >
                  <Layers className="w-4 h-4" />
                  <span>Open ERP Software ↗</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogIn className="w-4 h-4 rotate-180" />
                </button>
              </div>
            ) : (
              <button
                onClick={handlePortalClick}
                className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-98"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-100/80 text-indigo-800 text-xs font-bold border border-indigo-200 shadow-2xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Collector NA Sanctioned Plots & Construction in Nashik</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Building Landmarks, Delivering{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                100% Clear Title
              </span>{' '}
              Properties
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Vishwas Developer delivers premium residential NA plots, luxury bungalows, and commercial hubs with complete transparency, computerized legal receipts, and modern infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={handlePortalClick}
                className="w-full sm:w-auto px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isAuthenticated ? 'Open ERP Software Dashboard' : 'Staff & Client ERP Login'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#projects"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-sm rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Explore Projects ({db.projects.length})</span>
              </a>

              <button
                onClick={() => setIsMobileInstallOpen(true)}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Mobile App (APK)</span>
              </button>
            </div>
          </div>

          {/* Key Statistics Strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <p className="text-3xl font-black text-indigo-600">{db.projects.length}</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">Ongoing Projects</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Nashik & Surrounding</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <p className="text-3xl font-black text-emerald-600">{db.properties.length}+</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">Total Units & Plots</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Plots, Flats, Commercial</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <p className="text-3xl font-black text-purple-600">{db.customers.length}+</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">Happy Families</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Registered Property Owners</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
              <p className="text-3xl font-black text-teal-600">100%</p>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">Clear Title Guarantee</p>
              <p className="text-[11px] text-slate-400 mt-0.5">NA 44 Order & Sanctioned</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Ongoing Projects */}
      <section id="projects" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Prime Locations & Master Layouts
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Featured Real Estate Projects
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-md">
              Each project is developed with standard 40ft/30ft internal roads, drainage pipelines, electricity connectivity, and clear registry title deeds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {db.projects.map((proj) => {
              const projectUnits = db.properties.filter((p) => p.projectId === proj.id);
              const availableUnits = projectUnits.filter((p) => p.status === 'Available');
              const startingRate = projectUnits.length > 0
                ? Math.min(...projectUnits.map((p) => p.ratePerSqFt || 1500))
                : 1500;

              return (
                <div
                  key={proj.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                        {proj.type}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-semibold">
                        Code: {proj.code}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">{proj.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{proj.address}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {proj.notes || 'Premium NA plotted layout with wide asphalt roads and water connection.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Total Layout</p>
                        <p className="font-bold text-slate-800">{proj.totalUnits || projectUnits.length} Units</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Available</p>
                        <p className="font-bold text-emerald-600">{availableUnits.length} Units Ready</p>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Rates Starting From</span>
                        <p className="text-base font-extrabold text-slate-900 font-mono">
                          ₹{startingRate.toLocaleString('en-IN')}{' '}
                          <span className="text-xs text-slate-500 font-normal">/ sq.ft</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={handlePortalClick}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>View Detailed Layout & Booking</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Live Available Plots & Properties Showcase */}
      <section id="properties" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Ready For Booking
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Available Plots & Properties
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {['ALL', 'Plot', 'Flat', 'Commercial Shop'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'ALL' ? 'All Types' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableProperties.slice(0, 8).map((prop) => (
              <div
                key={prop.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {prop.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {prop.propertyType}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{prop.number}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{prop.projectName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-slate-400 font-medium">Area</p>
                      <p className="font-bold font-mono text-slate-800">{prop.areaSqFt} Sq.Ft</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Facing / Pos.</p>
                      <p className="font-bold text-slate-800">{prop.position || 'Standard'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Price</p>
                    <p className="font-extrabold font-mono text-base text-indigo-700">
                      {formatCurrency(prop.totalPrice)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePortalClick}
                  className="mt-3 w-full py-1.5 px-3 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 rounded-lg text-xs font-bold transition-all text-center"
                >
                  Book / Inquire in ERP ↗
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={handlePortalClick}
              className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs shadow-2xs transition-colors inline-flex items-center gap-2"
            >
              <span>View All {db.properties.length} Properties in ERP Management System</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Mobile App (APK / PWA) Banner Section */}
      <section id="mobile-app" className="py-16 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Download Android Mobile Application (APK / PWA)</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Manage Site Operations, Daily Labour & Receipts Directly on Your Phone
              </h2>

              <p className="text-sm text-indigo-200 leading-relaxed">
                Take your ERP on site! No Google Play Store required. Install directly to your Android homescreen as a standalone native app with camera receipt capture, offline mode, and instant WhatsApp billing.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setIsMobileInstallOpen(true)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Mobile App (1-Tap)</span>
                </button>

                <button
                  onClick={() => setIsMobileInstallOpen(true)}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-indigo-300" />
                  <span>Scan QR Code</span>
                </button>
              </div>
            </div>

            {/* Mobile Mockup Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xs flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-3 rounded-xl shadow-md shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-vyd26f3zajj37cfl4quv23-791603188061.asia-northeast1.run.app'
                  )}&color=312e81`}
                  alt="QR Code for Mobile App"
                  className="w-36 h-36 rounded-md object-contain"
                />
                <p className="text-[10px] font-bold text-slate-800 text-center mt-1">Scan on Mobile</p>
              </div>

              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-white text-sm">How to Download on Android:</h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-indigo-200 text-[11px]">
                  <li>Open link in <strong className="text-white">Google Chrome</strong> on phone.</li>
                  <li>Tap the <strong className="text-white">3 dots (⋮)</strong> menu at top right.</li>
                  <li>Select <strong className="text-emerald-400 font-bold">&ldquo;Install App&rdquo;</strong> or <strong className="text-emerald-400 font-bold">&ldquo;Add to Home screen&rdquo;</strong>.</li>
                  <li>The app will install instantly with desktop icon!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why Choose Us / Features Section */}
      <section id="features" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Enterprise Reliability</span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Why Customers & Promoters Trust Us
            </h2>
            <p className="text-xs text-slate-500">
              End-to-end transparency from booking token to official registry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Instant Computerized Receipts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate official money receipts with previous balances, remaining dues, and automatic PDF download / WhatsApp sharing.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Google Cloud Firebase Persistence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All records are backed up and synchronized in real time to Google Cloud Firestore with enterprise attribute-based security rules.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Zero Hidden Fees & Flexible EMI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Transparent development charges (₹{db.masterSettings.defaultDevelopmentChargeRate || 100}/sq.ft), clear EMI payment schedules, and verified bank accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Contact & Office Location Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-300 text-xs pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                  YO
                </div>
                <h4 className="font-extrabold text-white text-base">
                  {company.companyName || 'Vishwas Developer'}
                </h4>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                {company.businessNature || 'Real Estate Developer, Land Promoter & Construction Contractor'}
              </p>
              <div className="pt-2">
                <button
                  onClick={handlePortalClick}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Portal Login (ERP)</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Head Office</h5>
              <p className="text-slate-400 leading-relaxed">
                {company.companyAddress}
              </p>
              <p className="text-slate-400">
                GSTIN: <span className="font-mono text-slate-200">{company.gstNumber}</span>
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Direct Contact</h5>
              <p className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>{company.mobileNumber}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>{company.email}</span>
              </p>
              <p className="text-slate-400">
                Bank: <span className="text-slate-200 font-semibold">{company.bankName}</span><br />
                A/C: <span className="font-mono text-slate-200">{company.accountNumber}</span><br />
                IFSC: <span className="font-mono text-slate-200">{company.ifscCode}</span>
              </p>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px]">Portal Navigation</h5>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <button onClick={handlePortalClick} className="hover:text-white transition-colors">
                    Staff & Accounts Login
                  </button>
                </li>
                <li>
                  <button onClick={() => setIsMobileInstallOpen(true)} className="hover:text-white transition-colors">
                    Download Mobile App
                  </button>
                </li>
                <li>
                  <a href="#projects" className="hover:text-white transition-colors">
                    View Ongoing Layouts
                  </a>
                </li>
                <li>
                  <a href="#properties" className="hover:text-white transition-colors">
                    Available Plots Inquiry
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} {company.companyName}. All Rights Reserved.</p>
            <p className="flex items-center gap-1">
              <span>Powered by</span>
              <strong className="text-slate-300">VYAPAR ONE ERP Cloud System</strong>
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => onEnterERP()}
      />

      {/* Mobile Download Modal */}
      <MobileInstallModal
        isOpen={isMobileInstallOpen}
        onClose={() => setIsMobileInstallOpen(false)}
      />
    </div>
  );
};
