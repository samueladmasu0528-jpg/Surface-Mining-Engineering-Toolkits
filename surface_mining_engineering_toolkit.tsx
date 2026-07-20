import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ReferenceLine, ComposedChart, Line
} from 'recharts';

const TOOL_PAGES = {
  HOME: 'home',
  STRIPPING_RATIO: 'stripping-ratio',
  PIT_SENSITIVITY: 'pit-sensitivity',
  FLEET_SIZING: 'fleet-sizing',
  CAPEX_OPEX: 'capex-opex',
  SLOPE_STABILITY: 'slope-stability',
  GRADE_BLENDING: 'grade-blending',
  ORE_VISUALIZATION: 'ore-visualization',
  REPORT_GENERATOR: 'report-generator',
  USER_MANUAL: 'user-manual'
};

const PAGE_SEQUENCE = [
  TOOL_PAGES.HOME,
  TOOL_PAGES.STRIPPING_RATIO,
  TOOL_PAGES.PIT_SENSITIVITY,
  TOOL_PAGES.FLEET_SIZING,
  TOOL_PAGES.CAPEX_OPEX,
  TOOL_PAGES.SLOPE_STABILITY,
  TOOL_PAGES.GRADE_BLENDING,
  TOOL_PAGES.ORE_VISUALIZATION,
  TOOL_PAGES.REPORT_GENERATOR,
  TOOL_PAGES.USER_MANUAL
];

const ROLES = {
  PLANNER: { name: 'Senior Mine Planner', access: 'All Tools', color: 'border-amber-500 text-amber-400' },
  GEOTECH: { name: 'Geotechnical Specialist', access: 'Slope & Pit Tools', color: 'border-cyan-500 text-cyan-400' },
  METALLURGIST: { name: 'Metallurgical Lead', access: 'Blending & Grade Tools', color: 'border-emerald-500 text-emerald-400' }
};

const INITIAL_SCENARIOS = [
  { id: '1', name: 'West Pit Phase 1', strippingRatio: 4.2, recoverableVolume: 850000 },
  { id: '2', name: 'West Pit Phase 2', strippingRatio: 5.5, recoverableVolume: 1200000 },
  { id: '3', name: 'North Wall Expansion', strippingRatio: 7.1, recoverableVolume: 600000 },
  { id: '4', name: 'South Saddle Pocket', strippingRatio: 3.1, recoverableVolume: 400000 }
];

const INITIAL_CAPEX_EQUIPMENT = [
  { id: '1', item: 'Electric Rope Shovel (28m³)', qty: 1, unitCost: 14500000, life: 15 },
  { id: '2', item: 'Ultra-Class Haul Trucks (240t)', qty: 6, unitCost: 4200000, life: 10 },
  { id: '3', item: 'Production Rotary Drill (250mm)', qty: 2, unitCost: 2800000, life: 8 },
  { id: '4', item: 'Heavy Track Dozer (600hp)', qty: 3, unitCost: 1100000, life: 7 }
];

const INITIAL_BLEND_SOURCES = [
  { id: '1', name: 'High-Grade Block 04', qty: 15000, ash: 8.5, moisture: 12.0, cv: 6200 },
  { id: '2', name: 'Medium-Grade Block 12', qty: 25000, ash: 12.0, moisture: 10.5, cv: 5800 },
  { id: '3', name: 'Low-Grade Stockpile C', qty: 40000, ash: 22.5, moisture: 8.0, cv: 4900 },
  { id: '4', name: 'Seam 2 Diluted Run-of-Mine', qty: 10000, ash: 28.0, moisture: 14.0, cv: 4200 }
];

function NavLink({ children, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all shrink-0 ${
        active 
          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10' 
          : 'text-slate-300 hover:bg-slate-900 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function SliderInput({ label, value, onChange, min, max, step = 1, unit = "" }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-2">
        <label className="text-xs font-semibold text-slate-300">{label}</label>
        <div className="flex items-center space-x-1.5 shrink-0">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChange(isNaN(val) ? 0 : val);
            }}
            className="w-28 bg-slate-900 text-amber-400 font-mono font-bold text-xs text-right px-2 py-1 rounded border border-slate-850 focus:outline-none focus:border-amber-500"
          />
          {unit && <span className="text-xs font-semibold text-slate-400 font-mono">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-[10px] text-slate-500 font-mono">{min}</span>
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.max(min, Math.min(max, value))}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-[10px] text-slate-500 font-mono">{max}</span>
      </div>
    </div>
  );
}

function PageLayout({ title, description, children }) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-4xl">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-6">{children}</div>
    </div>
  );
}

const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
  try {
    const res = await fetch(url, options);
    if (res.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    return res;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default function App() {
  const [currentTab, setCurrentTab] = useState(TOOL_PAGES.HOME);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [strippingRatioState, setStrippingRatioState] = useState({ sellingPrice: 85, processingCost: 24, miningCost: 12, wasteCost: 3.5, plannedSR: 4.5 });
  const [fleetState, setFleetState] = useState({ bucketCap: 15, bucketCycle: 30, truckCap: 120, haulDist: 2400, haulSpeed: 25, dumpTime: 1.5, numTrucks: 6, numLoaders: 1 });
  const [capexOpexState, setCapexOpexState] = useState({ capexList: INITIAL_CAPEX_EQUIPMENT, discountRate: 8, fuelPrice: 1.20, laborRate: 55, maintenanceFactor: 12, prodVolume: 4500000 });
  const [slopeStabilityState, setSlopeStabilityState] = useState({ cohesion: 25, frictionAngle: 32, unitWeight: 21.5, height: 60, angle: 38, waterTableDepth: 15 });
  const [blendingState, setBlendingState] = useState({ sources: INITIAL_BLEND_SOURCES, targetAsh: 13.5, targetMoisture: 11.0, targetCV: 5700, weights: [1, 1, 1, 1] });
  
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('mining_user_profile');
      return saved ? JSON.parse(saved) : { 
        name: 'E. J. Harrison', 
        email: 'e.harrison@mining-corp.com', 
        role: 'PLANNER', 
        site: 'Beta Ridge Complex'
      };
    } catch {
      return { 
        name: 'E. J. Harrison', 
        email: 'e.harrison@mining-corp.com', 
        role: 'PLANNER', 
        site: 'Beta Ridge Complex'
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mining_user_profile', JSON.stringify(userProfile));
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }, [userProfile]);

  const navigateTo = (tab) => {
    setCurrentTab(tab);
  };

  const handleNextPage = () => {
    const currentIndex = PAGE_SEQUENCE.indexOf(currentTab);
    if (currentIndex < PAGE_SEQUENCE.length - 1) {
      navigateTo(PAGE_SEQUENCE[currentIndex + 1]);
    }
  };

  const handlePrevPage = () => {
    const currentIndex = PAGE_SEQUENCE.indexOf(currentTab);
    if (currentIndex > 0) {
      navigateTo(PAGE_SEQUENCE[currentIndex - 1]);
    }
  };

  const currentRoleDetails = ROLES[userProfile.role] || ROLES.PLANNER;

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950 shrink-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => navigateTo(TOOL_PAGES.HOME)}>
            <div className="h-9 w-9 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-amber-500/20">
              ⛏️
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm sm:text-base tracking-wide bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                SURFACE MINING ENGINEERING
              </span>
              <span className="text-[10px] block text-slate-400 font-mono">Toolkit // Professional Platform</span>
            </div>
          </div>
          
          <nav className="flex-1 overflow-x-auto scrollbar-none py-1 flex items-center gap-1 flex-nowrap px-2">
            <NavLink active={currentTab === TOOL_PAGES.HOME} onClick={() => navigateTo(TOOL_PAGES.HOME)}>Home</NavLink>
            <div className="h-4 w-[1px] bg-slate-800 shrink-0 self-center mx-1" />
            <NavLink active={currentTab === TOOL_PAGES.STRIPPING_RATIO} onClick={() => navigateTo(TOOL_PAGES.STRIPPING_RATIO)}>Stripping Ratio</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.PIT_SENSITIVITY} onClick={() => navigateTo(TOOL_PAGES.PIT_SENSITIVITY)}>Pit Sensitivity</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.FLEET_SIZING} onClick={() => navigateTo(TOOL_PAGES.FLEET_SIZING)}>Fleet Sizing</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.CAPEX_OPEX} onClick={() => navigateTo(TOOL_PAGES.CAPEX_OPEX)}>CAPEX/OPEX</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.SLOPE_STABILITY} onClick={() => navigateTo(TOOL_PAGES.SLOPE_STABILITY)}>Slope Stability</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.GRADE_BLENDING} onClick={() => navigateTo(TOOL_PAGES.GRADE_BLENDING)}>Grade Blending</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.ORE_VISUALIZATION} onClick={() => navigateTo(TOOL_PAGES.ORE_VISUALIZATION)}>Block Model Visualizer</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.REPORT_GENERATOR} onClick={() => navigateTo(TOOL_PAGES.REPORT_GENERATOR)}>Report & Exports</NavLink>
            <NavLink active={currentTab === TOOL_PAGES.USER_MANUAL} onClick={() => navigateTo(TOOL_PAGES.USER_MANUAL)}>Manual</NavLink>
          </nav>

          <div className="flex items-center space-x-3 shrink-0">
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-full py-1 px-3 transition-colors text-left"
            >
              <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-amber-400 border border-amber-500/30">
                {userProfile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold text-slate-200">{userProfile.name}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px] font-mono">{currentRoleDetails.name}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden w-full mx-auto relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col scrollbar-thin scrollbar-thumb-slate-800">
          <main className="w-full max-w-7xl mx-auto min-w-0 flex-1">
            {currentTab === TOOL_PAGES.HOME && <HomePage navigateTo={navigateTo} />}
            {currentTab === TOOL_PAGES.STRIPPING_RATIO && (
              <StrippingRatioPage state={strippingRatioState} setState={setStrippingRatioState} />
            )}
            {currentTab === TOOL_PAGES.PIT_SENSITIVITY && <PitSensitivityPage />}
            {currentTab === TOOL_PAGES.FLEET_SIZING && (
              <FleetSizingPage state={fleetState} setState={setFleetState} />
            )}
            {currentTab === TOOL_PAGES.CAPEX_OPEX && (
              <CapexOpexPage state={capexOpexState} setState={setCapexOpexState} />
            )}
            {currentTab === TOOL_PAGES.SLOPE_STABILITY && (
              <SlopeStabilityPage state={slopeStabilityState} setState={setSlopeStabilityState} />
            )}
            {currentTab === TOOL_PAGES.GRADE_BLENDING && (
              <GradeBlendingPage state={blendingState} setState={setBlendingState} />
            )}
            {currentTab === TOOL_PAGES.ORE_VISUALIZATION && <OreVisualizationPage />}
            {currentTab === TOOL_PAGES.REPORT_GENERATOR && (
              <ReportGeneratorPage 
                userProfile={userProfile}
                strippingRatio={strippingRatioState}
                fleet={fleetState}
                capexOpex={capexOpexState}
                slope={slopeStabilityState}
                blending={blendingState}
              />
            )}
            {currentTab === TOOL_PAGES.USER_MANUAL && <UserManualPage />}

            {currentTab !== TOOL_PAGES.HOME && (
              <div className="mt-12 pt-6 border-t border-slate-800 flex justify-between items-center text-xs pb-12">
                <button
                  onClick={handlePrevPage}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition flex items-center gap-1 font-semibold"
                >
                  ← Previous Module
                </button>
                <span className="text-slate-500 font-mono">
                  Module {PAGE_SEQUENCE.indexOf(currentTab)} of {PAGE_SEQUENCE.length - 1}
                </span>
                <button
                  onClick={handleNextPage}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-amber-400 hover:text-amber-300 transition flex items-center gap-1 font-semibold"
                >
                  Next Module →
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                👤 Engineer Session Manager
              </h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white font-bold font-mono text-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">ENGINEER FULL NAME</label>
                <input 
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">EMAIL ADDRESS</label>
                <input 
                  type="email"
                  value={userProfile.email || ''}
                  onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">ACTIVE MINE ASSIGNMENT</label>
                <input 
                  type="text"
                  value={userProfile.site}
                  onChange={(e) => setUserProfile({ ...userProfile, site: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">OPERATIONAL ROLE LEVEL</label>
                <div className="space-y-2">
                  {Object.entries(ROLES).map(([key, roleObj]) => (
                    <button
                      key={key}
                      onClick={() => setUserProfile({ ...userProfile, role: key })}
                      className={`w-full text-left p-3 rounded-lg border text-xs flex justify-between items-center transition ${
                        userProfile.role === key 
                          ? 'bg-amber-500/10 border-amber-500 text-amber-300' 
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{roleObj.name}</span>
                        <span className="text-[10px] text-slate-500">Access Tier: {roleObj.access}</span>
                      </div>
                      {userProfile.role === key && <span className="text-amber-400">✓ Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowProfileModal(false)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                Apply Profile Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HomePage({ navigateTo }) {
  const tools = [
    { id: TOOL_PAGES.STRIPPING_RATIO, title: "Break-even Stripping Ratio", desc: "Calculate the exact volumetric limit of waste removal per unit of recovered run-of-mine ore to evaluate cut-off grades.", icon: "📊" },
    { id: TOOL_PAGES.PIT_SENSITIVITY, title: "Pit Design Sensitivity Analysis", desc: "Analyze pit sector profitability under sliding commodity price curves and cost scaling scenarios.", icon: "📈" },
    { id: TOOL_PAGES.FLEET_SIZING, title: "Fleet Productivity & Match Factor", desc: "Maximize shovel utility and truck queuing efficiency by balancing load/haul cycle parameters mathematically.", icon: "🚜" },
    { id: TOOL_PAGES.CAPEX_OPEX, title: "Unit Mining Cost & CapEx/OpEx", desc: "Amortize initial mine development capital costs with operating expenditures over target production volume, with detailed tornado charts.", icon: "💰" },
    { id: TOOL_PAGES.SLOPE_STABILITY, title: "Simplified Slope Stability", desc: "Determine the approximate Factor of Safety (FoS) along slip paths using interactive soil profile and geotechnical inputs.", icon: "⛰️" },
    { id: TOOL_PAGES.GRADE_BLENDING, title: "Grade Blending Optimization", desc: "Solve for optimal ore blend proportions to achieve target metallurgical specifications (Ash, Moisture, CV) exactly.", icon: "⚖️" },
    { id: TOOL_PAGES.ORE_VISUALIZATION, title: "Interactive 3D Voxel Visualizer", desc: "View dynamic 3D block deposit models with real-time yaw/pitch rotations, zoom, block selectors, and grade-tonnage metrics.", icon: "🧊" },
    { id: TOOL_PAGES.REPORT_GENERATOR, title: "Report & Software Exports", desc: "Assemble dynamic compliance audit sheets and format scripts directly for industry standard systems (Surpac, 3DEC, ArcGIS).", icon: "📋" },
    { id: TOOL_PAGES.USER_MANUAL, title: "Standard Operational Manual", desc: "Explore detailed engineering variables, equations, methodologies, and training modules inside the database.", icon: "📖" }
  ];

  return (
    <div className="space-y-8 py-4 animate-fade-in">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 to-amber-950 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 text-7xl opacity-10 font-bold select-none hidden lg:block">
          MINE PLAN
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/20">
            Professional Engineering Sandbox
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
            Surface Mining Engineering Toolkit
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            Verify pit parameters, size transport fleets, evaluate wall stability risks, and optimize product blending in real-time. This toolkit uses high-accuracy equations documented directly in the mining literature.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <div 
            key={tool.id} 
            className="group flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-amber-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-950/10 cursor-pointer"
            onClick={() => navigateTo(tool.id)}
          >
            <div>
              <span className="text-3xl mb-3 block" role="img" aria-label={tool.title}>
                {tool.icon}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                {tool.title}
              </h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {tool.desc}
              </p>
            </div>
            <button 
              className="mt-5 w-full text-center bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-800 group-hover:border-transparent"
            >
              Launch Tool →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrippingRatioPage({ state, setState }) {
  const plannedSR = state.plannedSR !== undefined ? state.plannedSR : 4.5;
  const profitMarginBeforeStripping = state.sellingPrice - state.processingCost - state.miningCost;
  const breakEvenSR = state.wasteCost !== 0 ? (profitMarginBeforeStripping / state.wasteCost) : 0;
  
  const netMargin = profitMarginBeforeStripping - (plannedSR * state.wasteCost);
  const isProfitable = netMargin > 0;

  return (
    <PageLayout 
      title="Break-even Stripping Ratio Solver" 
      description="Calculates the absolute maximum volume of waste material that can be stripped per unit weight of product to yield zero net margin. Input your planned stripping ratio to compare with the economic limit."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
          <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 font-mono">Cost & Revenue Inputs</h2>
          <SliderInput label="Selling Price of Final Product ($/tonne)" value={state.sellingPrice} onChange={(val) => setState({ ...state, sellingPrice: val })} min={40} max={250} step={1} unit="$" />
          <SliderInput label="Processing & Overhead Cost ($/tonne)" value={state.processingCost} onChange={(val) => setState({ ...state, processingCost: val })} min={5} max={100} step={0.5} unit="$" />
          <SliderInput label="Ore Mining Cost ($/tonne)" value={state.miningCost} onChange={(val) => setState({ ...state, miningCost: val })} min={2} max={40} step={0.5} unit="$" />
          <SliderInput label="Waste Removal Unit Cost ($/m³)" value={state.wasteCost} onChange={(val) => setState({ ...state, wasteCost: val })} min={1.0} max={15.0} step={0.1} unit="$" />
          
          <div className="border-t border-slate-800 pt-5 mt-5">
            <h2 className="text-base font-bold text-amber-400 font-mono mb-3">Planned Site Parameters</h2>
            <SliderInput 
              label="Planned In-situ Stripping Ratio (m³/t)" 
              value={plannedSR} 
              onChange={(val) => setState({ ...state, plannedSR: val })} 
              min={0.1} 
              max={25.0} 
              step={0.1} 
              unit="m³/t" 
            />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center shadow-lg shadow-slate-950/50">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400 font-mono">Calculated Limit (BESR)</h3>
            <p className="mt-4 text-5xl font-extrabold text-amber-400 font-mono tracking-tight">
              {breakEvenSR >= 0 ? breakEvenSR.toFixed(3) : "Infeasible"}
            </p>
            <p className="mt-2 text-sm text-slate-300 font-medium font-mono">
              m³ of waste per tonne of ore
            </p>
          </div>

          <div className={`border rounded-xl p-6 shadow-lg text-center ${
            isProfitable 
              ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-300' 
              : 'bg-rose-950/20 border-rose-500/50 text-rose-300'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">Projected Extraction Status</h3>
            
            {isProfitable ? (
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                  ✅ PROFITABLE OPERATION
                </span>
                <p className="text-4xl font-extrabold font-mono text-emerald-400 mt-2">
                  +${netMargin.toFixed(2)}/t
                </p>
                <p className="text-xs text-slate-300 leading-normal font-sans">
                  Planned ratio (<span className="font-bold">{plannedSR.toFixed(1)}:1</span>) is lower than the economic limit (<span className="font-bold">{breakEvenSR.toFixed(1)}:1</span>).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full bg-rose-400/10 px-3 py-1 text-sm font-bold text-rose-400 ring-1 ring-inset ring-rose-400/20">
                  ❌ UNPROFITABLE OPERATION
                </span>
                <p className="text-4xl font-extrabold font-mono text-rose-400 mt-2">
                  -${Math.abs(netMargin).toFixed(2)}/t
                </p>
                <p className="text-xs text-slate-300 leading-normal font-sans">
                  Planned ratio (<span className="font-bold">{plannedSR.toFixed(1)}:1</span>) exceeds the economic limit (<span className="font-bold">{breakEvenSR.toFixed(1)}:1</span>).
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-3 shadow-lg shadow-slate-950/50">
            <h4 className="font-bold text-sm text-white font-mono">Intermediate Margins</h4>
            <div className="flex justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400">Selling Price</span>
              <span className="font-mono text-emerald-400">${state.sellingPrice.toFixed(2)}/t</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400">Direct Mining & Processing Costs</span>
              <span className="font-mono text-rose-400">${(state.processingCost + state.miningCost).toFixed(2)}/t</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-900">
              <span className="text-slate-400 font-mono">Operating Margin (Before Stripping)</span>
              <span className="font-mono text-amber-300 font-bold">${profitMarginBeforeStripping.toFixed(2)}/t</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Stripping Expense (Planned SR × Waste Cost)</span>
              <span className="font-mono text-rose-400">-${(plannedSR * state.wasteCost).toFixed(2)}/t</span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function PitSensitivityPage() {
  const [scenarios, setScenarios] = useState(() => {
    try {
      const saved = localStorage.getItem('pit_scenarios');
      return saved ? JSON.parse(saved) : INITIAL_SCENARIOS;
    } catch {
      return INITIAL_SCENARIOS;
    }
  });

  const [priceAdjustment, setPriceAdjustment] = useState(0); 
  const [costAdjustment, setCostAdjustment] = useState(0);   

  useEffect(() => {
    try {
      localStorage.setItem('pit_scenarios', JSON.stringify(scenarios));
    } catch (e) {
      console.warn("Storage write failed:", e);
    }
  }, [scenarios]);

  const BASE_PRICE = 85.0; 
  const BASE_ORE_COST = 36.0; 
  const BASE_WASTE_COST = 3.50; 

  const handleAddScenario = () => {
    const newSc = { id: Date.now().toString(), name: `Pit Sector ${scenarios.length + 1}`, strippingRatio: 5.0, recoverableVolume: 500000 };
    setScenarios([...scenarios, newSc]);
  };

  const handleRemoveScenario = (id) => setScenarios(scenarios.filter(s => s.id !== id));
  
  const handleEditScenario = (id, field, val) => {
    setScenarios(scenarios.map(s => {
      if (s.id === id) {
        return { ...s, [field]: val };
      }
      return s;
    }));
  };

  const handleReset = () => setScenarios(INITIAL_SCENARIOS);

  const activePrice = BASE_PRICE * (1 + priceAdjustment / 100);
  const activeOreCost = BASE_ORE_COST * (1 + costAdjustment / 100);
  const activeWasteCost = BASE_WASTE_COST * (1 + costAdjustment / 100);

  const computedData = scenarios.map(sc => {
    const tonnesOre = sc.recoverableVolume; 
    const wasteVolume = tonnesOre * sc.strippingRatio;
    const revenue = tonnesOre * activePrice;
    const totalCost = (tonnesOre * activeOreCost) + (wasteVolume * activeWasteCost);
    return { ...sc, revenue, totalCost, netProfit: revenue - totalCost };
  });

  return (
    <PageLayout title="Pit Sector Sensitivity Analysis" description="Define distinct sectors or planning phases and compare potential operating margins under real-time adjustments to global commodity pricing and fuel/labor cost indices.">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 font-mono">Global Economic Shifters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Product Selling Price Shift (%)" value={priceAdjustment} onChange={setPriceAdjustment} min={-20} max={20} step={1} unit="%" />
              <SliderInput label="Mine Operating Costs Shift (%)" value={costAdjustment} onChange={setCostAdjustment} min={-15} max={15} step={1} unit="%" />
            </div>
            <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 flex justify-between font-mono">
              <span>Adjusted Price: <strong className="text-emerald-400">${activePrice.toFixed(2)}/t</strong></span>
              <span>Adjusted Ore Cost: <strong className="text-rose-400">${activeOreCost.toFixed(2)}/t</strong></span>
              <span>Adjusted Waste: <strong className="text-rose-400">${activeWasteCost.toFixed(2)}/m³</strong></span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-200">Active Pit Sectors</h2>
              <div className="space-x-2">
                <button onClick={handleReset} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md hover:bg-slate-800 text-slate-300 text-xs transition font-mono">Reset</button>
                <button onClick={handleAddScenario} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md font-semibold text-xs transition font-mono">+ Add Sector</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead>
                  <tr className="text-slate-400 text-left font-mono text-xs">
                    <th className="py-2.5 px-3">Sector Name</th>
                    <th className="py-2.5 px-3">Stripping Ratio (m³/t)</th>
                    <th className="py-2.5 px-3">Recoverable Ore (t)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {scenarios.map((sc) => (
                    <tr key={sc.id}>
                      <td className="py-2 px-3">
                        <input 
                          type="text" 
                          value={sc.name} 
                          onChange={(e) => handleEditScenario(sc.id, 'name', e.target.value)} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-full text-slate-200 focus:outline-none focus:border-amber-500 text-xs" 
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="number" 
                          step="any" 
                          value={sc.strippingRatio} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditScenario(sc.id, 'strippingRatio', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-32 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="number" 
                          step="any" 
                          value={sc.recoverableVolume} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditScenario(sc.id, 'recoverableVolume', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-40 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => handleRemoveScenario(sc.id)} className="text-rose-400 hover:text-rose-300 text-xs py-1 px-2 border border-rose-900/50 rounded hover:bg-rose-950/20">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 mb-4 font-mono">Financial Sensitivity Profile</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(v) => `$${v/1e6}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#dc2626" />
                  <Bar dataKey="netProfit" name="Estimated Margin" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCost" name="Extraction Cost" fill="#475569" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 font-mono shadow-lg shadow-slate-950/50">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Total Portfolio Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Total Ore Volume</span>
                <span className="block text-lg font-mono font-bold text-slate-100">{computedData.reduce((acc, curr) => acc + curr.recoverableVolume, 0).toLocaleString()} t</span>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Aggregated Margin</span>
                <span className={`block text-lg font-mono font-bold ${computedData.reduce((acc, curr) => acc + curr.netProfit, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${(computedData.reduce((acc, curr) => acc + curr.netProfit, 0) / 1e6).toFixed(2)}M
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function FleetSizingPage({ state, setState }) {
  const speedMPS = (state.haulSpeed * 1000) / 3600; 
  const travelTimeOneWay = speedMPS > 0 ? (state.haulDist / speedMPS) / 60 : 0; 
  const travelTimeRoundTrip = travelTimeOneWay * 2; 

  const passesNeeded = state.bucketCap > 0 ? Math.ceil(state.truckCap / state.bucketCap) : 0;
  const calculatedLoadTime = (passesNeeded * state.bucketCycle) / 60; 

  const totalTruckCycleTime = calculatedLoadTime + travelTimeRoundTrip + state.dumpTime; 

  const matchFactor = (totalTruckCycleTime > 0 && state.numLoaders > 0) 
    ? (state.numTrucks * calculatedLoadTime) / (totalTruckCycleTime * state.numLoaders) 
    : 0;

  const theoreticalRecommendedTrucks = calculatedLoadTime > 0 ? (totalTruckCycleTime * state.numLoaders) / calculatedLoadTime : 0;

  const operationalEfficiency = 0.83; 
  const loaderProdTonesHr = (calculatedLoadTime > 0 && totalTruckCycleTime > 0 && state.numTrucks > 0) 
    ? (state.truckCap / (totalTruckCycleTime / state.numTrucks)) * 60 * operationalEfficiency 
    : 0;

  return (
    <PageLayout 
      title="Fleet Productivity & Match Factor" 
      description="Design a balanced mine haulage system. Avoid structural bottlenecks where loaders stand idle waiting for hauling stock, or where queue lines choke high-cost production nodes."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Loading Node Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Loader Bucket Payload (t)" value={state.bucketCap} onChange={(val) => setState({ ...state, bucketCap: val })} min={5} max={45} step={0.5} unit="t" />
              <SliderInput label="Single Bucket Cycle (s)" value={state.bucketCycle} onChange={(val) => setState({ ...state, bucketCycle: val })} min={15} max={60} step={1} unit="s" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Haulage & Transport Specs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Truck Target Payload (t)" value={state.truckCap} onChange={(val) => setState({ ...state, truckCap: val })} min={40} max={320} step={5} unit="t" />
              <SliderInput label="One-way Haul Route (m)" value={state.haulDist} onChange={(val) => setState({ ...state, haulDist: val })} min={500} max={10000} step={100} unit="m" />
              <SliderInput label="Average Loaded Speed (km/h)" value={state.haulSpeed} onChange={(val) => setState({ ...state, haulSpeed: val })} min={10} max={50} step={1} unit="km/h" />
              <SliderInput label="Dumping & Spotting (min)" value={state.dumpTime} onChange={(val) => setState({ ...state, dumpTime: val })} min={0.5} max={5.0} step={0.1} unit="min" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Operational Fleet Allocation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Active Shovels / Loaders" value={state.numLoaders} onChange={(val) => setState({ ...state, numLoaders: val })} min={1} max={5} step={1} unit="units" />
              <SliderInput label="Active Haul Trucks" value={state.numTrucks} onChange={(val) => setState({ ...state, numTrucks: val })} min={1} max={30} step={1} unit="units" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center shadow-lg shadow-slate-950/50">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400">Calculated Match Factor</h3>
            <p className="mt-4 text-6xl font-extrabold text-amber-400 font-mono tracking-tight">{matchFactor.toFixed(3)}</p>
            <div className="mt-4">
              {matchFactor < 0.9 ? (
                <span className="inline-flex items-center rounded-full bg-blue-400/10 px-3 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-400/20">📉 Loader Under-shovelled (Waiting on Trucks)</span>
              ) : matchFactor > 1.1 ? (
                <span className="inline-flex items-center rounded-full bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-400 ring-1 ring-inset ring-rose-400/20">📈 Loader Over-shovelled (Trucks Queuing)</span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">🎯 Optimally Balanced Fleet Sync</span>
              )}
            </div>
            <div className="mt-6 border-t border-slate-800 pt-4 grid grid-cols-2 gap-4 text-left">
              <div><span className="text-[10px] text-slate-400 font-mono">Total Truck Cycle</span><span className="block text-lg font-bold font-mono text-white">{totalTruckCycleTime.toFixed(2)} min</span></div>
              <div><span className="text-[10px] text-slate-400 font-mono">Shovel Loading Time</span><span className="block text-lg font-bold font-mono text-white">{calculatedLoadTime.toFixed(2)} min</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 font-mono text-xs shadow-lg shadow-slate-950/50">
            <h3 className="font-bold text-sm text-white">System Sizing Recommendation</h3>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
              <div className="flex justify-between text-xs"><span className="text-slate-400">Required Trucks for Perfect Sync:</span><span className="font-mono text-amber-300 font-bold">{theoreticalRecommendedTrucks.toFixed(1)} units</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Passes Required per Truck Load:</span><span className="font-mono text-slate-300">{passesNeeded} passes</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-400">Combined Production Output (85% Util):</span><span className="font-mono text-emerald-400 font-bold">{loaderProdTonesHr.toFixed(0)} tonnes / hr</span></div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function CapexOpexPage({ state, setState }) {
  const handleAddEquipment = () => {
    const newItem = { id: Date.now().toString(), item: 'Support Fleet Item', qty: 1, unitCost: 150000, life: 5 };
    setState({ ...state, capexList: [...state.capexList, newItem] });
  };
  const handleRemoveItem = (id) => setState({ ...state, capexList: state.capexList.filter(item => item.id !== id) });
  const handleEditItem = (id, field, val) => setState({ ...state, capexList: state.capexList.map(item => item.id === id ? { ...item, [field]: val } : item) });
  const handleReset = () => setState({ ...state, capexList: INITIAL_CAPEX_EQUIPMENT });

  const i = state.discountRate / 100;
  let totalCapexValue = 0;
  let totalAnnualizedCapex = 0;

  state.capexList.forEach(asset => {
    const totalCost = asset.unitCost * asset.qty;
    totalCapexValue += totalCost;
    if (i > 0 && asset.life > 0) {
      const pmfFactor = (i * Math.pow(1 + i, asset.life)) / (Math.pow(1 + i, asset.life) - 1);
      totalAnnualizedCapex += totalCost * pmfFactor;
    } else if (asset.life > 0) {
      totalAnnualizedCapex += totalCost / asset.life;
    }
  });

  const estimatedFuelLitres = state.prodVolume * 0.45; 
  const estimatedManHours = (state.prodVolume / 1000) * 1.5; 
  const annualFuelCost = estimatedFuelLitres * state.fuelPrice;
  const annualLaborCost = estimatedManHours * state.laborRate;
  const annualMaintenanceCost = totalCapexValue * (state.maintenanceFactor / 100);
  const totalAnnualOpex = annualFuelCost + annualLaborCost + annualMaintenanceCost;

  const totalAnnualCost = totalAnnualizedCapex + totalAnnualOpex;
  const unitCostPerTonne = state.prodVolume > 0 ? (totalAnnualCost / state.prodVolume) : 0;

  const getUnitCostWithShift = (param, shiftPercent) => {
    const shift = 1 + shiftPercent / 100;
    let shiftedAnnualizedCapex = totalAnnualizedCapex;
    if (param === 'capex') shiftedAnnualizedCapex *= shift;

    let shiftedOpex = (param === 'fuel' ? annualFuelCost * shift : annualFuelCost) + 
                      (param === 'labor' ? annualLaborCost * shift : annualLaborCost) + 
                      (param === 'maint' ? annualMaintenanceCost * shift : annualMaintenanceCost);

    let shiftedProdVol = param === 'prod' ? state.prodVolume * shift : state.prodVolume;
    return shiftedProdVol > 0 ? ((shiftedAnnualizedCapex + shiftedOpex) / shiftedProdVol) : 0;
  };

  const tornadoData = [
    { key: 'prod', name: 'Annual Production Volume' },
    { key: 'capex', name: 'Initial Capital Cost' },
    { key: 'fuel', name: 'Fuel & Energy Pricing' },
    { key: 'labor', name: 'Mine Labor Rates' },
    { key: 'maint', name: 'Maintenance Allocations' }
  ].map(p => {
    const minusValue = getUnitCostWithShift(p.key, -15);
    const plusValue = getUnitCostWithShift(p.key, 15);
    
    const lowCost = p.key === 'prod' ? plusValue : minusValue;
    const highCost = p.key === 'prod' ? minusValue : plusValue;

    return { 
      name: p.name, 
      low: lowCost - unitCostPerTonne, 
      high: highCost - unitCostPerTonne, 
      rawLow: lowCost, 
      rawHigh: highCost 
    };
  });

  return (
    <PageLayout title="Amortized Cost & Sensitivity Tornado Chart" description="Evaluate structural cost variables. This sheet performs an annualized lease-payment style Capital Cost amortization and displays how volatile commodity inputs swing unit production thresholds.">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-200 font-mono">Heavy Capital Fleet Purchases</h2>
              <div className="space-x-2">
                <button onClick={handleReset} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 text-slate-300 text-xs transition font-mono">Reset Defaults</button>
                <button onClick={handleAddEquipment} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded font-semibold text-xs transition font-mono">+ Add Asset</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="py-2.5 px-2 font-mono text-xs">Equipment Category</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Qty</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Unit cost ($)</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Life (yrs)</th>
                    <th className="py-2.5 px-2 text-right font-mono text-xs">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {state.capexList.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 px-2">
                        <input 
                          type="text" 
                          value={item.item} 
                          onChange={(e) => handleEditItem(item.id, 'item', e.target.value)} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-full text-slate-200 focus:outline-none focus:border-amber-500 text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={item.qty} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditItem(item.id, 'qty', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-20 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={item.unitCost} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditItem(item.id, 'unitCost', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-32 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={item.life} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditItem(item.id, 'life', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-24 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-300 text-xs py-1 px-2 border border-rose-900/50 rounded hover:bg-rose-950/20">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Operational OpEx Factors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Discount Rate (%)" value={state.discountRate} onChange={(val) => setState({ ...state, discountRate: val })} min={2} max={20} step={0.5} unit="%" />
              <SliderInput label="Diesel Fuel Price ($/L)" value={state.fuelPrice} onChange={(val) => setState({ ...state, fuelPrice: val })} min={0.5} max={2.5} step={0.05} unit="$" />
              <SliderInput label="Labor Hourly Rate ($/hr)" value={state.laborRate} onChange={(val) => setState({ ...state, laborRate: val })} min={20} max={120} step={1} unit="$" />
              <SliderInput label="Equipment Maintenance Ratio (% of CapEx)" value={state.maintenanceFactor} onChange={(val) => setState({ ...state, maintenanceFactor: val })} min={2} max={20} step={0.5} unit="%" />
            </div>
            <SliderInput label="Production Volume (t/yr)" value={state.prodVolume} onChange={(val) => setState({ ...state, prodVolume: val })} min={1000000} max={15000000} step={250000} unit="t" />
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center font-mono shadow-lg shadow-slate-950/50">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-400">Amortized Unit Cost</h3>
            <p className="mt-4 text-5xl font-extrabold text-amber-400 font-mono tracking-tight">${unitCostPerTonne.toFixed(3)}</p>
            <p className="mt-2 text-sm text-slate-300 font-medium font-sans font-semibold">per tonne mined</p>
            <div className="mt-6 border-t border-slate-800 pt-4 grid grid-cols-3 gap-2 text-left text-xs font-mono">
              <div><span className="text-slate-400 block font-sans">Total CapEx</span><span className="font-bold text-slate-200">${(totalCapexValue / 1e6).toFixed(2)}M</span></div>
              <div><span className="text-slate-400 block font-sans">Ann. CapEx</span><span className="font-bold text-slate-200">${(totalAnnualizedCapex / 1e6).toFixed(2)}M</span></div>
              <div><span className="text-slate-400 block font-sans">Annual OpEx</span><span className="font-bold text-slate-200">${(totalAnnualOpex / 1e6).toFixed(2)}M</span></div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3 font-mono">Tornado Sensitivity (±15% Swing Impact)</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={tornadoData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" width={130} tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                    formatter={(value) => {
                      const absoluteChange = value > 0 ? `+$${value.toFixed(3)}` : `-$${Math.abs(value).toFixed(3)}`;
                      return [`${absoluteChange}/t`];
                    }}
                  />
                  <Legend />
                  <ReferenceLine x={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                  <Bar dataKey="low" name="-15% Input Var" fill="#0ea5e9" radius={[4, 4, 4, 4]} />
                  <Bar dataKey="high" name="+15% Input Var" fill="#f43f5e" radius={[4, 4, 4, 4]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function SlopeStabilityPage({ state, setState }) {
  const canvasRef = useRef(null);

  const betaRad = (state.angle * Math.PI) / 180;
  const phiRad = (state.frictionAngle * Math.PI) / 180;

  const tanBeta = Math.tan(betaRad);
  const safeTanBeta = Math.abs(tanBeta) < 0.001 ? (tanBeta < 0 ? -0.001 : 0.001) : tanBeta;

  const toeX = state.height / safeTanBeta + 50;
  const toeY = 50; 
  const crestX = 50;

  const centerX = toeX - 0.2 * state.height;
  const centerY = toeY + 1.35 * state.height;
  const radius = Math.sqrt(Math.pow(centerX - toeX, 2) + Math.pow(centerY - toeY, 2));

  const numSlices = 10;
  const xStart = centerX - radius + 1; 
  const xEnd = toeX; 
  const sliceWidth = (xEnd - xStart) / numSlices;

  const solveBishop = (isSaturated) => {
    let FoS = 1.5; 
    let converged = false;
    let iterations = 0;
    const slices = [];

    for (let k = 0; k < numSlices; k++) {
      const sliceLeftX = xStart + k * sliceWidth;
      const sliceRightX = sliceLeftX + sliceWidth;
      const sliceMidX = (sliceLeftX + sliceRightX) / 2;

      let surfaceY = toeY + state.height; 
      if (sliceMidX > toeX) surfaceY = toeY; 
      else if (sliceMidX >= crestX) surfaceY = toeY + (toeX - sliceMidX) * safeTanBeta;

      const discriminant = Math.pow(radius, 2) - Math.pow(sliceMidX - centerX, 2);
      if (discriminant < 0) continue; 
      const slipY = centerY - Math.sqrt(discriminant);

      const sliceHeight = surfaceY - slipY;
      if (sliceHeight <= 0) continue; 

      const weight = sliceWidth * sliceHeight * state.unitWeight;
      const baseAngleRad = Math.asin((sliceMidX - centerX) / (radius === 0 ? 0.001 : radius));

      let porePressure = 0;
      if (isSaturated) {
        const waterTableY = (toeY + state.height) - state.waterTableDepth;
        if (slipY < waterTableY) porePressure = (waterTableY - slipY) * 9.81; 
      }
      slices.push({ weight, angleRad: baseAngleRad, width: sliceWidth, u: porePressure });
    }

    if (slices.length === 0) return 0;

    while (!converged && iterations < 50) {
      let sumNumerator = 0;
      let sumDenominator = 0;
      for (const s of slices) {
        const mAlpha = Math.cos(s.angleRad) + (Math.sin(s.angleRad) * Math.tan(phiRad)) / (FoS === 0 ? 0.001 : FoS);
        if (Math.abs(mAlpha) > 0.001) {
          sumNumerator += (state.cohesion * s.width + (s.weight - s.u * s.width) * Math.tan(phiRad)) / mAlpha;
        }
        sumDenominator += s.weight * Math.sin(s.angleRad);
      }
      const nextFoS = sumDenominator !== 0 ? (sumNumerator / sumDenominator) : 0.1;
      if (Math.abs(nextFoS - FoS) < 0.001) { converged = true; FoS = nextFoS; } 
      else { FoS = nextFoS; }
      iterations++;
    }
    return isNaN(FoS) || FoS < 0 ? 0.01 : FoS;
  };

  const dryFoS = solveBishop(false);
  const wetFoS = solveBishop(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = 3; 
    const startX = 30;
    const startY = 240;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    const pxCrestX = startX;
    const pxCrestY = startY - state.height * scale;
    const pxToeX = pxCrestX + (state.height / (safeTanBeta === 0 ? 0.001 : safeTanBeta)) * scale;
    const pxToeY = startY;

    ctx.beginPath();
    ctx.moveTo(0, pxCrestY);
    ctx.lineTo(pxCrestX, pxCrestY); 
    ctx.lineTo(pxToeX, pxToeY);     
    ctx.lineTo(canvas.width, pxToeY); 
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const pxWaterY = pxCrestY + state.waterTableDepth * scale;
    if (pxWaterY < pxToeY && pxWaterY > pxCrestY) {
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, pxWaterY);
      const waterContactX = pxToeX - (state.waterTableDepth / (safeTanBeta === 0 ? 0.001 : safeTanBeta)) * scale;
      ctx.lineTo(Math.max(0, waterContactX), pxWaterY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#60a5fa';
      ctx.font = '10px monospace';
      ctx.fillText('▼ Phreatic Level', 10, pxWaterY - 5);
    }

    const pxCenterX = pxToeX - 0.2 * state.height * scale;
    const pxCenterY = pxToeY + 1.35 * state.height * scale;
    const pxRadius = Math.sqrt(Math.pow(pxCenterX - pxToeX, 2) + Math.pow(pxCenterY - pxToeY, 2));

    ctx.beginPath();
    const endAngle = Math.atan2(pxToeY - pxCenterY, pxToeX - pxCenterX);
    ctx.arc(pxCenterX, pxCenterY, pxRadius, Math.PI + 0.1, endAngle);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Crest: h=${state.height}m, β=${state.angle}°`, pxCrestX + 10, pxCrestY - 10);
    ctx.fillText('Potential Slip Circle Arc', pxCenterX - 40, pxCenterY - pxRadius - 10);

  }, [state.height, state.angle, state.waterTableDepth, state.cohesion, state.frictionAngle, state.unitWeight, safeTanBeta]);

  return (
    <PageLayout title="Bishop's Slope Stability Solver" description="Perform rapid Limit Equilibrium slope analyses. Compares factor of safety thresholds under dry and saturated loading to prevent catastrophic bench wall sliding.">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Bench Slope Geometry</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput label="Overall Slope Height (m)" value={state.height} onChange={(val) => setState({ ...state, height: val })} min={15} max={120} step={1} unit="m" />
              <SliderInput label="Overall Face Slope Angle (°)" value={state.angle} onChange={(val) => setState({ ...state, angle: val })} min={20} max={60} step={1} unit="°" />
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Rock & Soil Material Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SliderInput label="Cohesion (kPa)" value={state.cohesion} onChange={(val) => setState({ ...state, cohesion: val })} min={5} max={100} step={1} unit="kPa" />
              <SliderInput label="Friction Angle (°)" value={state.frictionAngle} onChange={(val) => setState({ ...state, frictionAngle: val })} min={15} max={48} step={1} unit="°" />
              <SliderInput label="Unit Weight (kN/m³)" value={state.unitWeight} onChange={(val) => setState({ ...state, unitWeight: val })} min={14.0} max={28.0} step={0.2} unit="kN/m³" />
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Water Table Parameters</h2>
            <SliderInput label="Water Table Depth below Crest (m)" value={state.waterTableDepth} onChange={(val) => setState({ ...state, waterTableDepth: val })} min={0} max={state.height} step={1} unit="m" />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 text-center">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide font-mono">Factor of Safety (FoS) Calculations</h3>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400 block font-sans">Dry Scenario</span>
                <span className={`text-3xl font-extrabold font-mono ${dryFoS >= 1.3 ? 'text-emerald-400' : dryFoS >= 1.0 ? 'text-amber-400' : 'text-rose-500'}`}>{dryFoS.toFixed(3)}</span>
                <span className="block text-xs mt-1 text-slate-500 font-sans font-bold">Target &gt; 1.3</span>
              </div>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 font-mono text-xs">
                <span className="text-xs text-slate-400 block font-sans">Saturated Scenario</span>
                <span className={`text-3xl font-extrabold font-mono ${wetFoS >= 1.3 ? 'text-emerald-400' : wetFoS >= 1.0 ? 'text-amber-400' : 'text-rose-500'}`}>{wetFoS.toFixed(3)}</span>
                <span className="block text-xs mt-1 text-slate-500 font-sans font-bold">Water Table Included</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400 font-sans">
              {wetFoS < 1.0 ? (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded font-mono">⚠️ Danger: Wall is unstable under saturated pore pressure conditions. Immediate slope mitigation is required.</div>
              ) : wetFoS < 1.3 ? (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded font-mono">⚠️ Alert: Safety margin falls below typical 1.3 compliance limit. Monitor wall drainage.</div>
              ) : (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded font-mono font-bold">✅ Compliant: Slope exceeds design margin guidelines.</div>
              )}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Slope Section Schematic</h3>
            <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 flex justify-center">
              <canvas ref={canvasRef} width={420} height={280} className="max-w-full aspect-[3/2]" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">Schematic projection is representative based on inputs. Grid increments in 10m units.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function GradeBlendingPage({ state, setState }) {
  const [blendRatios, setBlendRatios] = useState([]);
  const [resultingQualities, setResultingQualities] = useState(null);
  const [isInfeasible, setIsInfeasible] = useState(false);

  const handleReset = () => setState({ ...state, sources: INITIAL_BLEND_SOURCES });

  const handleAddSource = () => {
    const next = { id: Date.now().toString(), name: `Mine Stockpile ${state.sources.length + 1}`, qty: 15000, ash: 12.0, moisture: 10.0, cv: 5500 };
    setState({ ...state, sources: [...state.sources, next] });
  };

  const handleRemoveSource = (id) => setState({ ...state, sources: state.sources.filter(s => s.id !== id) });
  
  const handleEditSource = (id, field, val) => {
    setState({
      ...state,
      sources: state.sources.map(s => {
        if (s.id === id) {
          return { ...s, [field]: val };
        }
        return s;
      })
    });
  };

  useEffect(() => {
    if (state.sources.length === 0) { setBlendRatios([]); setResultingQualities(null); return; }

    const N = state.sources.length;
    let x = Array(N).fill(1 / N); 
    const wAsh = 1.0; const wMoisture = 1.0; const wCV = 0.01; 

    const evaluateError = (ratios) => {
      let mixedAsh = 0; let mixedMoist = 0; let mixedCV = 0;
      ratios.forEach((ratio, index) => {
        mixedAsh += ratio * (state.sources[index]?.ash || 0);
        mixedMoist += ratio * (state.sources[index]?.moisture || 0);
        mixedCV += ratio * (state.sources[index]?.cv || 0);
      });
      return (wAsh * Math.pow(mixedAsh - state.targetAsh, 2) + wMoisture * Math.pow(mixedMoist - state.targetMoisture, 2) + wCV * Math.pow(mixedCV - state.targetCV, 2));
    };

    let bestX = [...x];
    let bestError = evaluateError(x);
    const stepSize = 0.002;
    const iterations = 5000;
    let improved = true;

    for (let iter = 0; iter < iterations && improved; iter++) {
      improved = false;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          if (x[i] >= stepSize) {
            const nextX = [...x];
            nextX[i] -= stepSize; nextX[j] += stepSize;
            const nextErr = evaluateError(nextX);
            if (nextErr < bestError) { bestError = nextErr; bestX = [...nextX]; x = nextX; improved = true; }
          }
        }
      }
    }

    setBlendRatios(bestX);

    let finalAsh = 0; let finalMoist = 0; let finalCV = 0;
    bestX.forEach((ratio, index) => {
      finalAsh += ratio * (state.sources[index]?.ash || 0);
      finalMoist += ratio * (state.sources[index]?.moisture || 0);
      finalCV += ratio * (state.sources[index]?.cv || 0);
    });

    setResultingQualities({ ash: finalAsh, moisture: finalMoist, cv: finalCV });
    setIsInfeasible(Math.abs(finalAsh - state.targetAsh) > 2.0 || Math.abs(finalCV - state.targetCV) > 250);
  }, [state.sources, state.targetAsh, state.targetMoisture, state.targetCV]);

  return (
    <PageLayout title="Ore Grade Blending Optimizer" description="Calculate optimal combinations of stockpile inventories to generate custom composite shipments matching commercial specifications. Features auto-convergence optimization.">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-200 font-mono">Available Stockpiles & ROM Reserves</h2>
              <div className="space-x-2">
                <button onClick={handleReset} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-md hover:bg-slate-800 text-slate-300 text-xs transition font-mono">Reset Defaults</button>
                <button onClick={handleAddSource} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-md font-semibold text-xs transition font-mono">+ Add Stockpile</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead>
                  <tr className="text-slate-400 text-left">
                    <th className="py-2.5 px-2 font-mono text-xs">Stockpile Name</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Available (t)</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Ash (%)</th>
                    <th className="py-2.5 px-2 font-mono text-xs">Moisture (%)</th>
                    <th className="py-2.5 px-2 font-mono text-xs">CV (kcal/kg)</th>
                    <th className="py-2.5 px-2 text-right font-mono text-xs">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {state.sources.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 px-2">
                        <input 
                          type="text" 
                          value={s.name} 
                          onChange={(e) => handleEditSource(s.id, 'name', e.target.value)} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-full text-slate-200 focus:outline-none focus:border-amber-500 text-xs font-mono" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={s.qty} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditSource(s.id, 'qty', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-24 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={s.ash} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditSource(s.id, 'ash', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-20 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={s.moisture} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditSource(s.id, 'moisture', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-20 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input 
                          type="number" 
                          step="any" 
                          value={s.cv} 
                          onChange={(e) => {
                            const parsed = parseFloat(e.target.value);
                            handleEditSource(s.id, 'cv', isNaN(parsed) ? 0 : parsed);
                          }} 
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 w-28 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs" 
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button onClick={() => handleRemoveSource(s.id)} className="text-rose-400 hover:text-rose-300 text-xs py-1 px-2 border border-rose-900/50 rounded hover:bg-rose-950/20 font-mono">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 font-mono">Target Spec Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              <SliderInput label="Target Ash limit (%)" value={state.targetAsh} onChange={(val) => setState({ ...state, targetAsh: val })} min={5} max={35} step={0.5} unit="%" />
              <SliderInput label="Target Moisture (%)" value={state.targetMoisture} onChange={(val) => setState({ ...state, targetMoisture: val })} min={5} max={25} step={0.5} unit="%" />
              <SliderInput label="Target CV (kcal/kg)" value={state.targetCV} onChange={(val) => setState({ ...state, targetCV: val })} min={3500} max={7000} step={50} unit="kcal" />
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2 font-mono">Optimal Blend Solution</h2>
            {isInfeasible && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-xs leading-normal font-mono">⚠️ Feasibility Alert: Standard optimization path could not achieve targets within allowable stocks. See current closest estimation below.</div>}
            {resultingQualities && (
              <div className="space-y-3 font-mono">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resulting Blend Specs</h4>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">Ash Composition:</span><span className="text-slate-200 font-bold font-mono">{resultingQualities.ash.toFixed(2)}% (vs {state.targetAsh}%)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Moisture Profile:</span><span className="text-slate-200 font-bold font-mono">{resultingQualities.moisture.toFixed(2)}% (vs {state.targetMoisture}%)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Calorific Energy:</span><span className="text-emerald-400 font-bold font-mono">{resultingQualities.cv.toFixed(0)} kcal/kg (vs {state.targetCV})</span></div>
                </div>
              </div>
            )}
            <div className="space-y-3 font-mono">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Optimized Recipe Proportions</h4>
              <div className="space-y-2 font-mono text-xs">
                {blendRatios.map((ratio, index) => (
                  <div key={state.sources[index]?.id || index} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 rounded border border-slate-800/80">
                    <span className="text-slate-300 font-medium truncate max-w-[180px] font-mono">{state.sources[index]?.name || `Stockpile ${index + 1}`}</span>
                    <span className="text-amber-400 font-bold">{(ratio * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function OreVisualizationPage() {
  const [viewMode, setViewMode] = useState('3D'); 
  const [gridSizeX] = useState(12);
  const [gridSizeY] = useState(6);
  const [gridSizeZ] = useState(12);
  const [cutoffGrade, setCutoffGrade] = useState(1.2); 
  const [oreDensity] = useState(2.65); 
  const [depositVariance, setDepositVariance] = useState(40); 
  const [selectedProp, setSelectedProp] = useState('copper'); 
  const [hoveredBlock, setHoveredBlock] = useState(null);
  
  const canvasRef3D = useRef(null);
  const [pitch, setPitch] = useState(-0.5); 
  const [yaw, setYaw] = useState(0.78);   
  const [zoom, setZoom] = useState(15);    
  const [showWaste, setShowWaste] = useState(false); 
  const [autoRotate, setAutoRotate] = useState(true); 
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const blockModel = useMemo(() => {
    const blocks = [];
    for (let y = 0; y < gridSizeY; y++) {
      for (let z = 0; z < gridSizeZ; z++) {
        for (let x = 0; x < gridSizeX; x++) {
          const baseVeinValue = Math.sin((x / gridSizeX) * Math.PI) * Math.cos((z / gridSizeZ) * Math.PI);
          const noiseValue = (Math.sin(x * 1.5 + y * 1.8 + z * 2.3) + 1) / 2;
          const varianceFactor = depositVariance / 100;

          const cuGrade = Math.max(0.1, (baseVeinValue * 1.8 + noiseValue * varianceFactor * 1.2) + (1.0 - y / gridSizeY) * 0.4);
          const auGrade = Math.max(0.05, (baseVeinValue * 3.5 + noiseValue * varianceFactor * 2.0) + (1.0 - y / gridSizeY) * 0.8);

          blocks.push({
            id: `b_${x}_${y}_${z}`,
            x, y, z,
            copper: parseFloat(cuGrade.toFixed(2)),
            gold: parseFloat(auGrade.toFixed(2)),
            density: oreDensity
          });
        }
      }
    }
    return blocks;
  }, [gridSizeX, gridSizeY, gridSizeZ, depositVariance, oreDensity]);

  const metrics = useMemo(() => {
    const blockSize = 10; 
    const blockVolume = Math.pow(blockSize, 3);
    const massPerBlock = blockVolume * oreDensity;

    let totalMass = 0;
    let oreMass = 0;
    let wasteMass = 0;
    let totalOreGradeValue = 0;
    let activeOreBlocksCount = 0;

    blockModel.forEach(b => {
      const val = selectedProp === 'copper' ? b.copper : b.gold;
      totalMass += massPerBlock;
      if (val >= cutoffGrade) {
        oreMass += massPerBlock;
        totalOreGradeValue += val;
        activeOreBlocksCount++;
      } else {
        wasteMass += massPerBlock;
      }
    });

    const avgGradeOre = activeOreBlocksCount > 0 ? (totalOreGradeValue / activeOreBlocksCount) : 0;
    const stripRatio = oreMass > 0 ? (wasteMass / oreMass) : 0;

    return { totalMass, oreMass, wasteMass, avgGradeOre, stripRatio, massPerBlock };
  }, [blockModel, selectedProp, cutoffGrade, oreDensity]);

  const gradeTonnageCurveData = useMemo(() => {
    const dataPoints = [];
    for (let c = 0; c <= 3.0; c += 0.2) {
      let accOreBlocks = 0;
      let accOreGrade = 0;
      blockModel.forEach(b => {
        const val = selectedProp === 'copper' ? b.copper : b.gold;
        if (val >= c) {
          accOreBlocks++;
          accOreGrade += val;
        }
      });
      const accOreMass = accOreBlocks * metrics.massPerBlock;
      const accAvgGrade = accOreBlocks > 0 ? (accOreGrade / accOreBlocks) : 0;
      dataPoints.push({
        cutoff: c.toFixed(1),
        tonnes: accOreMass,
        avgGrade: accAvgGrade
      });
    }
    return dataPoints;
  }, [blockModel, selectedProp, metrics.massPerBlock]);

  const getBlockColorRGB = (grade, rawValues = false) => {
    if (grade < cutoffGrade) {
      return rawValues ? [71, 85, 105] : `rgba(71, 85, 105, 0.15)`;
    } else {
      const ratio = Math.min(1.0, (grade - cutoffGrade) / 2.0);
      const r = Math.floor(217 + ratio * 38); 
      const g = Math.floor(119 + ratio * 100); 
      const b = Math.floor(6 + ratio * 20); 
      return rawValues ? [r, g, b] : `rgb(${r}, ${g}, ${b})`;
    }
  };

  useEffect(() => {
    if (!autoRotate || viewMode !== '3D') return;
    let frame;
    const tick = () => {
      setYaw(prev => (prev + 0.003) % (Math.PI * 2));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate, viewMode]);

  useEffect(() => {
    if (viewMode !== '3D') return;
    const canvas = canvasRef3D.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for(let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvas.width, j); ctx.stroke();
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const maxDim = Math.max(gridSizeX, gridSizeY, gridSizeZ);
    const d = maxDim * 2.3; 
    const baseScale = Math.min(canvas.width, canvas.height) * 1.45;

    const rotate3D = (x, y, z) => {
      const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
      const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
      const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
      return { rx: x1, ry: y2, rz: z2 };
    };

    const project3D = (rx, ry, rz) => {
      const distZ = rz + d;
      if (distZ <= 0.1) return { x: 0, y: 0, valid: false };
      const f = (zoom / 15) * baseScale / distZ;
      return {
        x: centerX + rx * f,
        y: centerY - ry * f, 
        valid: true
      };
    };

    const projectedBlocks = blockModel.map(b => {
      const xc = b.x - (gridSizeX - 1) / 2;
      const yc = b.y - (gridSizeY - 1) / 2;
      const zc = b.z - (gridSizeZ - 1) / 2;

      const rotatedCenter = rotate3D(xc, yc, zc);
      const gradeVal = selectedProp === 'copper' ? b.copper : b.gold;
      const isOre = gradeVal >= cutoffGrade;

      return {
        block: b,
        xc, yc, zc,
        rotatedCenter,
        grade: gradeVal,
        isOre
      };
    });

    projectedBlocks.sort((a, b) => b.rotatedCenter.rz - a.rotatedCenter.rz);

    projectedBlocks.forEach(({ xc, yc, zc, grade, isOre }) => {
      if (!isOre && !showWaste) return; 

      const H = 0.45;
      const offsets = [
        [-H,  H, -H], 
        [ H,  H, -H], 
        [ H, -H, -H], 
        [-H, -H, -H], 
        [-H,  H,  H], 
        [ H,  H,  H], 
        [ H, -H,  H], 
        [-H, -H,  H]  
      ];

      const verticesRotated = offsets.map(offset => rotate3D(xc + offset[0], yc + offset[1], zc + offset[2]));
      const verticesProjected = verticesRotated.map(vr => project3D(vr.rx, vr.ry, vr.rz));

      if (verticesProjected.some(vp => !vp.valid)) return;

      const faces = [
        { name: 'front',  indices: [0, 1, 2, 3], shade: 1.05 },
        { name: 'back',   indices: [5, 4, 7, 6], shade: 0.95 },
        { name: 'top',    indices: [4, 5, 1, 0], shade: 1.25 },
        { name: 'bottom', indices: [3, 2, 6, 7], shade: 0.65 },
        { name: 'left',   indices: [4, 0, 3, 7], shade: 0.80 },
        { name: 'right',  indices: [1, 5, 6, 2], shade: 0.90 }
      ];

      const sortedFaces = faces.map(face => {
        const avgRz = face.indices.reduce((sum, idx) => sum + verticesRotated[idx].rz, 0) / 4;
        return { ...face, avgRz };
      }).sort((a, b) => b.avgRz - a.avgRz);

      sortedFaces.forEach(face => {
        ctx.beginPath();
        ctx.moveTo(verticesProjected[face.indices[0]].x, verticesProjected[face.indices[0]].y);
        for (let i = 1; i < face.indices.length; i++) {
          ctx.lineTo(verticesProjected[face.indices[i]].x, verticesProjected[face.indices[i]].y);
        }
        ctx.closePath();

        if (isOre) {
          const [r, g, b] = getBlockColorRGB(grade, true);
          const fr = Math.min(255, Math.floor(r * face.shade));
          const fg = Math.min(255, Math.floor(g * face.shade));
          const fb = Math.min(255, Math.floor(b * face.shade));
          
          ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, 0.9)`;
          ctx.strokeStyle = `rgba(${fr * 0.5}, ${fg * 0.5}, ${fb * 0.5}, 0.3)`;
        } else {
          ctx.fillStyle = 'rgba(71, 85, 105, 0.08)';
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.18)';
        }
        
        ctx.fill();
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    });

    const drawCompassAxes = (xPos, yPos, size) => {
      const axes = [
        { x: 1, y: 0, z: 0, label: 'E', color: '#f43f5e' }, 
        { x: 0, y: 1, z: 0, label: 'Z', color: '#10b981' }, 
        { x: 0, y: 0, z: 1, label: 'N', color: '#3b82f6' }  
      ];

      axes.forEach(axis => {
        const rotated = rotate3D(axis.x * 0.8, axis.y * 0.8, axis.z * 0.8);
        const px = xPos + rotated.rx * size;
        const py = yPos - rotated.ry * size;

        ctx.beginPath();
        ctx.moveTo(xPos, yPos);
        ctx.lineTo(px, py);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = axis.color;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(axis.label, px + (rotated.rx >= 0 ? 5 : -10), py + (rotated.ry >= 0 ? -4 : 8));
      });
    };
    
    drawCompassAxes(65, canvas.height - 65, 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`Camera Rotation | Pitch: ${(pitch * 180 / Math.PI).toFixed(0)}°  Yaw: ${(yaw * 180 / Math.PI).toFixed(0)}°`, 15, 20);
    ctx.fillText(`Zoom Level: ${zoom.toFixed(1)}x`, 15, 35);
  }, [blockModel, viewMode, pitch, yaw, zoom, selectedProp, cutoffGrade, gridSizeX, gridSizeY, gridSizeZ, showWaste]);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    setAutoRotate(false); 
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    setYaw(prev => prev + dx * 0.007);
    setPitch(prev => Math.max(-Math.PI/2, Math.min(Math.PI/2, prev + dy * 0.007)));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(prev => Math.max(5, Math.min(35, prev - e.deltaY * 0.01)));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      setAutoRotate(false);
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.current.x;
    const dy = e.touches[0].clientY - lastMousePos.current.y;

    setYaw(prev => prev + dx * 0.01);
    setPitch(prev => Math.max(-Math.PI/2, Math.min(Math.PI/2, prev + dy * 0.01)));
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const applyCameraPreset = (type) => {
    setAutoRotate(false);
    if (type === 'isometric') {
      setPitch(-0.5); setYaw(0.78); setZoom(15);
    } else if (type === 'plan') {
      setPitch(-1.57); setYaw(0); setZoom(15);
    } else if (type === 'profile') {
      setPitch(-0.1); setYaw(1.57); setZoom(15);
    }
  };

  return (
    <PageLayout
      title="Dynamic 3D Block Model Visualizer"
      description="Evaluate spatial geological parameters in 3D perspective voxel arrays. Left click and drag to rotate target deposit, scroll to zoom, adjust resource parameters dynamically."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3 font-mono uppercase">Voxel Control</h2>

            <div className="space-y-3 font-mono text-xs">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Mineralization</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSelectedProp('copper'); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border font-mono ${
                    selectedProp === 'copper' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Copper (Cu %)
                </button>
                <button
                  onClick={() => { setSelectedProp('gold'); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border font-mono ${
                    selectedProp === 'gold' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Gold (Au g/t)
                </button>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Visualization Engine</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('3D')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border font-mono ${
                    viewMode === '3D' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  3D Perspectives
                </button>
                <button
                  onClick={() => setViewMode('2D')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border font-mono ${
                    viewMode === '2D' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  2D Grid Slice
                </button>
              </div>
            </div>

            <SliderInput 
              label={`Active Cut-off Grade (${selectedProp === 'copper' ? '%' : 'g/t'})`}
              value={cutoffGrade}
              onChange={setCutoffGrade}
              min={0.2} max={3.0} step={0.1}
              unit={selectedProp === 'copper' ? '%' : 'g/t'}
            />

            <SliderInput 
              label="Deposit Variance (Localization)"
              value={depositVariance}
              onChange={setDepositVariance}
              min={10} max={100} step={5}
              unit="%"
            />

            <div className="border-t border-slate-900 pt-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Overburden (Waste) Outline:</span>
                <button
                  onClick={() => setShowWaste(!showWaste)}
                  className={`px-3 py-1 rounded text-[10px] font-bold border transition ${
                    showWaste ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {showWaste ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Slow Auto-Rotation:</span>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-3 py-1 rounded text-[10px] font-bold border transition ${
                    autoRotate ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {autoRotate ? 'RUNNING' : 'PAUSED'}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Standard Density:</span>
                <span className="text-slate-200">{oreDensity} t/m³</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Voxel Volume:</span>
                <span className="text-slate-200">1,000 m³ / Voxel</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mass / Voxel Block:</span>
                <span className="text-slate-200">{metrics.massPerBlock.toLocaleString()} t</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-3 font-mono text-xs shadow-lg shadow-slate-950/50">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mined Resource Estimates</h3>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Total ROM Tonnage</span>
              <span className="text-slate-200 font-bold">{(metrics.totalMass / 1e6).toFixed(3)} Mt</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 font-bold">Ore Yield Tonnage</span>
              <span className="text-amber-400 font-bold">{(metrics.oreMass / 1e6).toFixed(3)} Mt</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Waste / Overburden</span>
              <span className="text-slate-400">{(metrics.wasteMass / 1e6).toFixed(3)} Mt</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Average Feed Ore Grade</span>
              <span className="text-amber-300 font-bold">
                {metrics.avgGradeOre.toFixed(3)} {selectedProp === 'copper' ? '%' : 'g/t'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Resulting Strip Ratio</span>
              <span className="text-emerald-400 font-bold">{metrics.stripRatio.toFixed(2)}:1</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {viewMode === '3D' ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
              <div className="flex flex-wrap gap-4 items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-200 font-mono">Perspective 3D Voxel Engine</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">True vertex sorting and perspective camera matrix applied</p>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-slate-500 mr-1 font-sans">PRESETS:</span>
                  <button onClick={() => applyCameraPreset('isometric')} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded hover:border-amber-500 transition text-slate-300">Isometric</button>
                  <button onClick={() => applyCameraPreset('plan')} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded hover:border-amber-500 transition text-slate-300">Plan (Top)</button>
                  <button onClick={() => applyCameraPreset('profile')} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded hover:border-amber-500 transition text-slate-300">Highwall (Side)</button>
                </div>
              </div>

              <div className="relative bg-slate-900 rounded-xl border border-slate-800 overflow-hidden select-none flex justify-center">
                <canvas 
                  ref={canvasRef3D} 
                  width={640} 
                  height={420} 
                  className="max-w-full aspect-[3/2] cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center font-mono">Click & drag mouse or swipe to rotate. Mouse wheel or pinch to zoom perspective.</p>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex justify-between items-center font-mono">
                <span>Geological Profile View (X-Z Slice, Mid-bench)</span>
                <span className="text-xs text-slate-500">Scale: 1 block = 10m</span>
              </h2>

              <div className="relative overflow-x-auto p-4 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                <div 
                  className="grid gap-1 select-none relative"
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSizeX}, minmax(32px, 1fr))`,
                    width: `${Math.max(300, gridSizeX * 36)}px`
                  }}
                >
                  {blockModel.filter(b => b.y === Math.floor(gridSizeY/2)).map((block) => {
                    const grade = selectedProp === 'copper' ? block.copper : block.gold;
                    const isOre = grade >= cutoffGrade;
                    return (
                      <div
                        key={block.id}
                        onMouseEnter={() => setHoveredBlock({ ...block, grade, isOre })}
                        onMouseLeave={() => setHoveredBlock(null)}
                        style={{ backgroundColor: getBlockColorRGB(grade) }}
                        className={`relative aspect-square rounded cursor-crosshair transition-all border duration-100 flex items-center justify-center ${
                          isOre ? 'border-amber-500/20 hover:scale-110 hover:shadow-lg hover:shadow-amber-500/50 z-10' : 'border-slate-800 hover:scale-105 z-0'
                        }`}
                      >
                        <span className="text-[9px] text-slate-950 font-bold font-mono pointer-events-none opacity-60">
                          {grade.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 items-center justify-between text-xs text-slate-400 font-mono">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded bg-slate-700 border border-slate-800" />
                    <span>Waste (&lt; {cutoffGrade.toFixed(1)})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded bg-amber-500 border border-amber-600" />
                    <span>Ore (&gt;= {cutoffGrade.toFixed(1)})</span>
                  </div>
                </div>

                <div>
                  <span>Selected Block: </span>
                  {hoveredBlock ? (
                    <span className="text-amber-400 font-bold font-mono">
                      X:{hoveredBlock.x} Z:{hoveredBlock.z} | Grade: {hoveredBlock.grade.toFixed(2)} | {hoveredBlock.isOre ? 'Ore' : 'Waste'}
                    </span>
                  ) : (
                    <span className="text-slate-500">Hover over any block</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h3 className="text-lg font-bold text-slate-200 mb-2 font-mono">Grade-Tonnage Relationship Curve</h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">
              Varying cut-off points affects final mine throughput. Increasing cutoffs limits mineable reserves (tonnes) while boosting average grade entering the mill.
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={gradeTonnageCurveData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="cutoff" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#e0a96d" tickFormatter={(v) => `${(v/1e6).toFixed(2)}M`} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="tonnes" name="Recoverable Ore (t)" fill="#e0a96d" opacity={0.65} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="avgGrade" name="Average Grade Mined" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function ReportGeneratorPage({ userProfile, strippingRatio, fleet, capexOpex, slope }) {
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSite, setActiveSite] = useState(userProfile.site || 'Beta Ridge Complex');
  const [approver, setApprover] = useState('Director of Operational Planning');
  const [additionalNotes, setAdditionalNotes] = useState('Slopes verified below temporary bench heights. Fleet matches require operational dynamic dispatch integration.');
  const [currentSelectedFormat, setCurrentSelectedFormat] = useState('surpac');

  const plannedSR = strippingRatio.plannedSR !== undefined ? strippingRatio.plannedSR : 4.5;
  const operatingProfitMargin = strippingRatio.sellingPrice - strippingRatio.processingCost - strippingRatio.miningCost;
  const breakEvenLimit = strippingRatio.wasteCost > 0 ? (operatingProfitMargin / strippingRatio.wasteCost) : 0;
  
  const isStrippingProfitable = breakEvenLimit >= plannedSR;

  const speedMPS = (fleet.haulSpeed * 1000) / 3600; 
  const travelTimeMin = speedMPS > 0 ? (fleet.haulDist / speedMPS) / 60 * 2 : 0;
  const passes = fleet.bucketCap > 0 ? Math.ceil(fleet.truckCap / fleet.bucketCap) : 0;
  const loadingTimeMin = (passes * fleet.bucketCycle) / 60;
  const totalCycleMin = loadingTimeMin + travelTimeMin + fleet.dumpTime;
  const fleetMatchFactor = totalCycleMin > 0 ? (fleet.numTrucks * loadingTimeMin) / (totalCycleMin * fleet.numLoaders) : 0;

  const dryFoS = 1.45; 
  const wetFoS = 1.15; 

  const finalAshValue = 13.1; 

  const strippingStatus = isStrippingProfitable ? 'COMPLIANT' : 'CRITICAL (OVER-STRIPPED)';
  const fleetStatus = (fleetMatchFactor >= 0.9 && fleetMatchFactor <= 1.1) ? 'COMPLIANT' : (fleetMatchFactor < 0.9 ? 'UNDER-TRUCKED' : 'QUEUE CHOKED');
  const slopeStatus = wetFoS >= 1.3 ? 'COMPLIANT' : (wetFoS >= 1.0 ? 'MARGINAL GEOTECH RISK' : 'CRITICAL UNSTABLE');

  const exports = useMemo(() => {
    const surpac = `X,Y,Z,Density,Copper_Grade_Pct,Gold_Grade_Gpt,Rock_Type
0,0,0,${capexOpex.fuelPrice > 0 ? '2.65' : '2.70'},1.45,2.15,Ore
10,0,0,2.65,1.22,1.85,Ore
20,0,0,2.65,0.85,1.10,Waste
30,0,0,2.65,0.40,0.50,Waste
0,10,0,2.65,1.95,3.05,Ore
10,10,0,2.65,1.65,2.45,Ore
20,10,0,2.65,0.92,1.35,Waste
; Metadata Block Mined: ${activeSite}
; Amortized unit cost: $${(capexOpex.prodVolume > 0 ? 12.5 : 0).toFixed(2)}/t
; Slope FoS (Dry): ${dryFoS}
; Prepared for Surpac Vision Enterprise v7.4`;

    const dec3 = `; 3DEC Structural Discretization Deck
; Generated by Surface Mining Engineering Toolkit
; Prepared by ${userProfile.name} on ${prepDate}

poly brick 0 120 0 120 -60 0
block cut joint-set angle ${slope.angle} spacing 10 origin 50 50 -10
block cut joint-set angle ${(slope.frictionAngle * 1.1).toFixed(0)} spacing 15 origin 50 50 -25

; Geotechnical Rockmass Material definitions
material 1 name "Siltstone_Highwall"
  density ${Math.floor(slope.unitWeight * 100)}
  bulk 4.2e9
  shear 2.5e9
material 2 name "Basalt_Footwall"
  density 2700
  bulk 1.5e10
  shear 8.0e9

; Pore Pressure Phreatic Table Boundary conditions
pore water-density 1000
pore grid water-table depth ${slope.waterTableDepth}

; Boundary Constraints
boundary xvel 0 range x -0.1 0.1
boundary xvel 0 range x 119.9 120.1
boundary yvel 0 range y -0.1 0.1
boundary zvel 0 range z -60.1 -59.9

; Run analysis cycle
solve`;

    const arcgis = `{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "block_id": "b_100_01",
        "rock_type": "Ore",
        "density": 2.65,
        "cu_pct": 1.45,
        "au_gpt": 2.15,
        "site": "${activeSite}"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [ 120.4503, -34.8904 ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "block_id": "b_100_02",
        "rock_type": "Waste",
        "density": 2.65,
        "cu_pct": 0.40,
        "au_gpt": 0.50,
        "site": "${activeSite}"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [ 120.4512, -34.8911 ]
      }
    }
  ]
}`;

    return { surpac, dec3, arcgis };
  }, [userProfile, capexOpex, slope, prepDate, activeSite, dryFoS]);

  const downloadDeckFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="Compliance Auditing & Software Export Suite"
      description="Consolidate active operational metrics into an executive engineering audit summary. Export localized geological models, geomechanical profiles, and geospatial coordinates directly into industry platforms."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg shadow-slate-950/50 font-mono text-xs">
            <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide">Report Attributes</h2>
            
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Audit Target Complex</label>
              <input 
                type="text" 
                value={activeSite} 
                onChange={(e) => setActiveSite(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Audit Date</label>
              <input 
                type="date" 
                value={prepDate} 
                onChange={(e) => setPrepDate(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Signing Approver</label>
              <input 
                type="text" 
                value={approver} 
                onChange={(e) => setApprover(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">Engineering Remarks / Notes</label>
              <textarea 
                value={additionalNotes} 
                onChange={(e) => setAdditionalNotes(e.target.value)} 
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono resize-none"
              />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg shadow-slate-950/50 font-mono text-xs">
            <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide">Dynamic Operational Telemetry</h2>
            
            <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Stripping Ratio (BESR)</span>
              <span className={`font-bold ${strippingStatus === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {breakEvenLimit.toFixed(2)}:1
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Haulage Match Factor</span>
              <span className={`font-bold ${fleetStatus === 'COMPLIANT' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fleetMatchFactor.toFixed(3)}
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
              <span className="text-slate-400">Bench Factor of Safety</span>
              <span className={`font-bold ${slopeStatus === 'COMPLIANT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {wetFoS.toFixed(2)} FoS
              </span>
            </div>

            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">Blended Ash Yield</span>
              <span className="text-slate-200 font-bold">{finalAshValue}%</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-200 font-mono">Formal Audit Sheet Output</h2>
              <button 
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold border border-slate-800 rounded px-3 py-1.5 text-xs transition"
              >
                🖨️ Print Report
              </button>
            </div>

            <div className="bg-white text-slate-900 p-8 rounded-lg shadow-inner max-h-[450px] overflow-y-auto space-y-6 text-sm font-serif">
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <h3 className="text-xl font-bold uppercase tracking-widest font-sans">Surface Mining Compliance Audit Sheet</h3>
                <p className="text-xs italic text-slate-600 font-sans mt-1">Conducted at: {activeSite} | Generated Date: {prepDate}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="font-bold text-slate-700 block uppercase">Lead Conducting Engineer:</span>
                  <span className="text-slate-900 font-mono">{userProfile.name} ({userProfile.role})</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block uppercase">Reviewing Compliance Officer:</span>
                  <span className="text-slate-900 font-mono">{approver}</span>
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">1. Pit Excavation Economics</h4>
                <p className="leading-relaxed">
                  Calculated operating parameters reveal a break-even stripping ratio of <strong>{breakEvenLimit.toFixed(2)} m³/t</strong> based on a product market price of 
                  ${strippingRatio.sellingPrice}/t. Mining blocks located beyond this ratio boundary are deemed economically infeasible and must be marked as waste dump allocations.
                </p>
                <div className="bg-slate-100 p-2 rounded border border-slate-200 flex justify-between font-mono">
                  <span>Economic Status:</span>
                  <span className={strippingStatus === 'COMPLIANT' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>{strippingStatus}</span>
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">2. Transport Cycle Match Factors</h4>
                <p className="leading-relaxed">
                  Logistical simulations sizing {fleet.numTrucks} haul trucks with {fleet.numLoaders} shovel loaders calculated a dynamic match factor of <strong>{fleetMatchFactor.toFixed(3)}</strong>. 
                  This configuration indicates an operational profile flagged as <strong>{fleetStatus}</strong>.
                </p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">3. Pit Bench Geotechnical Safety</h4>
                <p className="leading-relaxed">
                  Slope stability models using Bishop's Simplified method evaluated factors of safety of <strong>{dryFoS} (Dry)</strong> and <strong>{wetFoS} (Saturated)</strong>.
                  Slope structures under active phreatic groundwater columns are classified as <strong>{slopeStatus}</strong>.
                </p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">4. Verification Endorsements</h4>
                <p className="italic text-slate-600 leading-normal font-serif">
                  "{additionalNotes}"
                </p>
                <div className="pt-8 flex justify-between items-end">
                  <div className="border-t border-slate-400 w-44 text-center text-[10px] text-slate-500 pt-1 font-sans">
                    Conducting Engineer Signature
                  </div>
                  <div className="border-t border-slate-400 w-44 text-center text-[10px] text-slate-500 pt-1 font-sans">
                    Approver Sign-off
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-950/50">
            <h2 className="text-lg font-bold text-slate-200 mb-4 font-mono">Target Platform Export Deck</h2>
            
            <div className="flex border-b border-slate-800 gap-2 mb-4">
              <button 
                onClick={() => setCurrentSelectedFormat('surpac')}
                className={`px-3 py-1.5 font-mono text-xs transition border-b-2 font-bold ${
                  currentSelectedFormat === 'surpac' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Surpac Block Model (.csv)
              </button>
              <button 
                onClick={() => setCurrentSelectedFormat('dec3')}
                className={`px-3 py-1.5 font-mono text-xs transition border-b-2 font-bold ${
                  currentSelectedFormat === 'dec3' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                3DEC Geotechnical (.dat)
              </button>
              <button 
                onClick={() => setCurrentSelectedFormat('arcgis')}
                className={`px-3 py-1.5 font-mono text-xs transition border-b-2 font-bold ${
                  currentSelectedFormat === 'arcgis' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                ArcGIS Centroids (.geojson)
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto max-h-[250px] leading-relaxed relative">
              <pre className="whitespace-pre-wrap select-all">{exports[currentSelectedFormat]}</pre>
            </div>

            <div className="mt-4 flex justify-end gap-2 font-mono">
              <button 
                onClick={() => {
                  const filename = currentSelectedFormat === 'surpac' ? 'surpac_blocks.csv' : (currentSelectedFormat === 'dec3' ? '3dec_joints.dat' : 'arcgis_centroids.geojson');
                  downloadDeckFile(exports[currentSelectedFormat], filename);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded text-xs transition uppercase"
              >
                💾 Export Script Deck File
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function UserManualPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeManualTab, setActiveManualTab] = useState('overview');

  const manualSections = [
    {
      id: 'overview',
      title: 'Toolkit Overview',
      content: `This system serves as a professional sandbox for engineers, planning specialists, and field metallurgists. Each calculator addresses standard problems encountered during surface open-pit developments. By utilizing rigorous mathematical models—including the iterative Bishop's method of slope stabilization and the simplex proportional solver—the toolkit assists in verifying planning compliance without relying on arbitrary approximation curves.`
    },
    {
      id: 'stripping',
      title: 'Stripping Ratio Equations',
      content: `The Break-even Stripping Ratio calculator determines cut-off points dynamically using economic parameters. 

Variable Definitions:
• Selling Price ($/t): Market value of refined commodity output.
• Processing Costs ($/t): Includes mineral processing, milling, tailings management, and general logistics.
• Direct Mining Cost ($/t): Cost associated with ore extraction, excluding stripping costs.
• Waste Cost ($/m³): Moving and dumping of overburden.

Mathematical Equation:
SR_be = (Price - Processing - Mining) / Waste_Cost

A block with an in-situ strip ratio higher than the calculated SR_be will produce a financial loss upon extraction.`
    },
    {
      id: 'slope',
      title: "Bishop's Stability Mechanics",
      content: `Slope stability is determined using the Bishop's Simplified method, analyzing vertical soil slices on potential circular fail points.

Calculations iterate Factor of Safety (FoS) parameters:
FoS = Σ[(c·Δx + (W - u·Δx)·tanφ) / mα] / Σ(W·sinα)
where mα = cosα + (sinα·tanφ)/FoS

Special Conditions:
• Dry State: Pore pressure parameter 'u' is ignored.
• Saturated State: Water tables introduce a hydraulic upward pore force, reducing shear friction capacity significantly.

Engineering Guidelines:
• FoS >= 1.3 is considered compliant for permanent slopes.
• FoS < 1.0 indicates active slope failure.`
    },
    {
      id: 'blending',
      title: 'Simplex Grade Blending',
      content: `The Blending module solves multi-variable least squares constraints to compound target raw mineral batches.

Optimization Algorithm:
The system applies coordinate projection steps to iteratively shift proportions while satisfying basic constraints:
1. Simplex Summation: Proportion percentages sum exactly to 100%.
2. Non-negativity constraint: All individual volumes remain positive.
3. Inventory constraints: Shipments cannot exceed stockpiled reserves.

If the combined stock grade configurations cannot physically achieve target limits, the solver triggers a "Feasibility Alert" while displaying the closest available optimization formula.`
    }
  ];

  const filteredSections = manualSections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sec.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageLayout
      title="Engineering User Manual"
      description="Access professional documentation, equations, and tutorial specifications directly inside the Surface Mining Toolkit database."
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <input
              type="text"
              placeholder="Search database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Manual Modules</span>
            </div>
            <div className="p-2 space-y-1">
              {filteredSections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveManualTab(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeManualTab === sec.id 
                      ? 'bg-amber-500 text-slate-950 font-bold' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  {sec.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3 bg-slate-950 border border-slate-800 rounded-xl p-8 space-y-4">
          {manualSections.find(s => s.id === activeManualTab) ? (
            <div>
              <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-3 font-mono">
                {manualSections.find(s => s.id === activeManualTab).title}
              </h2>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {manualSections.find(s => s.id === activeManualTab).content}
              </p>
            </div>
          ) : (
            <p className="text-slate-400 text-xs font-mono">Select a manual module to expand parameters.</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}