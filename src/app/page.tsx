"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Fingerprint,
  MonitorDot,
  Radio,
  ReceiptText,
  RotateCcw,
  ServerCrash,
  ShieldCheck,
  Terminal,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
  WalletCards,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  ARC_TESTNET,
  ARCTECTIVE_ABI,
  ARCTECTIVE_BADGES,
  ARCTECTIVE_CASES,
  ARCTECTIVE_CONTRACT_ADDRESS,
  DetectiveProfile,
  rankTitle,
  shortAddress,
} from "@/lib/arctective";

type Screen =
  | "intro"
  | "wallet"
  | "profile"
  | "registered"
  | "hub"
  | "caseDesk"
  | "tutorial"
  | "investigation"
  | "board"
  | "timeline"
  | "finalReport"
  | "closed"
  | "profileView"
  | "leaderboard"
  | "archive"
  | "arcTerminal";

type TxPurpose = "profile" | "case" | null;
type ClueId =
  | "buyer-receipt"
  | "merchant-terminal-log"
  | "invoice-id"
  | "arc-settlement-timestamp"
  | "stale-backend-warning"
  | "wallet-trail";
type BoardSlot = "Payment Trail" | "Contradiction" | "Root Cause" | "Final Proof";
type HotspotId =
  | "terminal"
  | "printer"
  | "invoice"
  | "scanner"
  | "server"
  | "camera";

type Clue = {
  id: ClueId;
  icon: string;
  title: string;
  text: string;
  byte: string;
};

type Hotspot = {
  id: HotspotId;
  label: string;
  clue: ClueId;
  className: string;
  Icon: typeof Terminal;
};

const CASE_ID = ARCTECTIVE_CASES.FINAL_RECEIPT;
const CASE_TITLE = "The Final Receipt";
const CASE_SCORE = 96;

const CLUES: Record<ClueId, Clue> = {
  "buyer-receipt": {
    id: "buyer-receipt",
    icon: "RCPT",
    title: "Buyer Receipt",
    text: "Receipt shows final settlement.",
    byte: "Receipt has a final timestamp. That matters.",
  },
  "merchant-terminal-log": {
    id: "merchant-terminal-log",
    icon: "TERM",
    title: "Merchant Terminal Log",
    text: "Terminal still says pending.",
    byte: "Pending here, final elsewhere. Smells stale.",
  },
  "invoice-id": {
    id: "invoice-id",
    icon: "INV",
    title: "Invoice ID",
    text: "Same invoice on both records.",
    byte: "Invoice matches. The dispute is status, not amount.",
  },
  "arc-settlement-timestamp": {
    id: "arc-settlement-timestamp",
    icon: "ARC",
    title: "Arc Settlement Timestamp",
    text: "Sub-second finality locked it.",
    byte: "Finality does not blink.",
  },
  "stale-backend-warning": {
    id: "stale-backend-warning",
    icon: "SYNC",
    title: "Stale Backend Warning",
    text: "Backend stopped syncing.",
    byte: "The backend froze before the truth arrived.",
  },
  "wallet-trail": {
    id: "wallet-trail",
    icon: "0x",
    title: "Wallet Trail",
    text: "Buyer wallet paid once.",
    byte: "One payment. One trail. No double spend drama.",
  },
};

const HOTSPOTS: Hotspot[] = [
  {
    id: "terminal",
    label: "Merchant Terminal",
    clue: "merchant-terminal-log",
    className: "terminal-object",
    Icon: MonitorDot,
  },
  {
    id: "printer",
    label: "Receipt Printer",
    clue: "buyer-receipt",
    className: "printer-object",
    Icon: ReceiptText,
  },
  {
    id: "invoice",
    label: "Invoice Board",
    clue: "invoice-id",
    className: "invoice-object",
    Icon: ClipboardCheck,
  },
  {
    id: "scanner",
    label: "Wallet Scanner",
    clue: "wallet-trail",
    className: "scanner-object",
    Icon: WalletCards,
  },
  {
    id: "server",
    label: "Backend Server",
    clue: "stale-backend-warning",
    className: "server-object",
    Icon: ServerCrash,
  },
  {
    id: "camera",
    label: "Timestamp Screen",
    clue: "arc-settlement-timestamp",
    className: "camera-object",
    Icon: Camera,
  },
];

const BOARD_SLOTS: BoardSlot[] = [
  "Payment Trail",
  "Contradiction",
  "Root Cause",
  "Final Proof",
];

const BOARD_RULES: Record<BoardSlot, ClueId[]> = {
  "Payment Trail": ["buyer-receipt", "wallet-trail"],
  Contradiction: ["merchant-terminal-log"],
  "Root Cause": ["stale-backend-warning"],
  "Final Proof": ["arc-settlement-timestamp"],
};

const TIMELINE_CORRECT = [
  "Buyer sent payment.",
  "Arc settlement finalized.",
  "Merchant backend failed to sync.",
  "Merchant falsely saw pending.",
];

const TIMELINE_START = [
  "Merchant falsely saw pending.",
  "Buyer sent payment.",
  "Merchant backend failed to sync.",
  "Arc settlement finalized.",
];

const badgeNames: Record<number, string> = {
  1: "Final Receipt Found",
  2: "Double-Pay Slayer",
  3: "Redaction Expert",
  100: "Rookie Arctective",
};

function hasInjectedWallet() {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Window & { ethereum?: unknown }).ethereum ||
      (window as Window & { phantom?: unknown }).phantom,
  );
}

function initialProgress() {
  if (typeof window === "undefined") {
    return {
      clues: [] as ClueId[],
      placements: emptyPlacements(),
      timeline: TIMELINE_START,
      timelineSolved: false,
      tutorialDone: false,
    };
  }
  const saved = window.localStorage.getItem("arctective-case-1");
  if (!saved) {
    return {
      clues: [] as ClueId[],
      placements: emptyPlacements(),
      timeline: TIMELINE_START,
      timelineSolved: false,
      tutorialDone: false,
    };
  }
  return {
    clues: [] as ClueId[],
    placements: emptyPlacements(),
    timeline: TIMELINE_START,
    timelineSolved: false,
    tutorialDone: false,
    ...(JSON.parse(saved) as Partial<{
      clues: ClueId[];
      placements: Record<BoardSlot, ClueId | null>;
      timeline: string[];
      timelineSolved: boolean;
      tutorialDone: boolean;
    }>),
  };
}

function emptyPlacements(): Record<BoardSlot, ClueId | null> {
  return {
    "Payment Trail": null,
    Contradiction: null,
    "Root Cause": null,
    "Final Proof": null,
  };
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();

  const [screen, setScreen] = useState<Screen>("intro");
  const [txPurpose, setTxPurpose] = useState<TxPurpose>(null);
  const [lastTx, setLastTx] = useState<string>("");
  const [walletAvailable, setWalletAvailable] = useState(() => hasInjectedWallet());
  const [music, setMusic] = useState(false);
  const [sfx, setSfx] = useState(true);
  const [form, setForm] = useState({ x: "", nickname: "", motto: "" });
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState(() => initialProgress());
  const [selectedClue, setSelectedClue] = useState<ClueId | null>(null);
  const [byteLine, setByteLine] = useState("Tap glowing objects. I will catch the receipts.");
  const [lastFound, setLastFound] = useState<ClueId | null>(null);
  const [wrongSlot, setWrongSlot] = useState<BoardSlot | null>(null);
  const [timelineShake, setTimelineShake] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const isArc = chainId === ARC_TESTNET.id;
  const avatarURI = form.x ? `https://unavatar.io/x/${form.x.replace("@", "")}` : "";

  const { data: hasProfile, refetch: refetchHasProfile } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "hasProfile",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isArc) },
  });

  const { data: profileData, refetch: refetchProfile } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "getProfile",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isArc && hasProfile) },
  });

  const { data: solvedIds, refetch: refetchSolved } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "getSolvedCaseIds",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isArc && hasProfile) },
  });

  const { data: badgeIds, refetch: refetchBadges } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "getUserBadgeIds",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isArc && hasProfile) },
  });

  const { data: hasSolvedCaseOne } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "hasSolvedCase",
    args: address ? [address, BigInt(CASE_ID)] : undefined,
    query: { enabled: Boolean(address && isArc && hasProfile) },
  });

  const { data: leaderboard } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "getTopDetectives",
    args: [BigInt(10)],
    query: { enabled: isArc },
  });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const profile = profileData as DetectiveProfile | undefined;
  const solvedCaseNumbers = useMemo(
    () => ((solvedIds ?? []) as readonly bigint[]).map((id) => Number(id)),
    [solvedIds],
  );
  const badgeNumbers = useMemo(
    () => ((badgeIds ?? []) as readonly bigint[]).map((id) => Number(id)),
    [badgeIds],
  );
  const boardSolved = BOARD_SLOTS.every((slot) => progress.placements[slot]);
  const canOpenBoard = progress.clues.length >= 4;
  const canCloseCase = boardSolved && progress.timelineSolved;

  useEffect(() => {
    window.localStorage.setItem("arctective-case-1", JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    const updateWalletState = () =>
      window.setTimeout(() => setWalletAvailable(hasInjectedWallet()), 0);
    window.addEventListener("ethereum#initialized", updateWalletState, { once: true });
    window.addEventListener("focus", updateWalletState);
    updateWalletState();
    return () => {
      window.removeEventListener("ethereum#initialized", updateWalletState);
      window.removeEventListener("focus", updateWalletState);
    };
  }, []);

  useEffect(() => {
    if (isConnected && isArc && hasProfile && screen === "wallet") {
      window.setTimeout(() => setScreen("hub"), 0);
    }
    if (isConnected && isArc && hasProfile === false && screen === "wallet") {
      window.setTimeout(() => setScreen("profile"), 0);
    }
  }, [hasProfile, isArc, isConnected, screen]);

  useEffect(() => {
    if (!receipt.isSuccess || !txHash) return;
    window.setTimeout(() => setLastTx(txHash), 0);
    void refetchHasProfile();
    void refetchProfile();
    void refetchSolved();
    void refetchBadges();
    if (txPurpose === "profile") {
      window.setTimeout(() => setScreen("registered"), 0);
    }
    if (txPurpose === "case") {
      window.setTimeout(() => setScreen("closed"), 0);
    }
  }, [
    receipt.isSuccess,
    refetchBadges,
    refetchHasProfile,
    refetchProfile,
    refetchSolved,
    txHash,
    txPurpose,
  ]);

  async function switchToArc() {
    const ethereum = (window as Window & {
      ethereum?: {
        request(args: { method: string; params?: unknown[] }): Promise<unknown>;
      };
    }).ethereum;

    try {
      await switchChainAsync({ chainId: ARC_TESTNET.id });
    } catch {
      await ethereum?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${ARC_TESTNET.id.toString(16)}`,
            chainName: ARC_TESTNET.name,
            nativeCurrency: ARC_TESTNET.nativeCurrency,
            rpcUrls: ARC_TESTNET.rpcUrls.default.http,
            blockExplorerUrls: [ARC_TESTNET.blockExplorers.default.url],
          },
        ],
      });
    }
  }

  async function createProfile(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    if (!form.x.trim() || !form.nickname.trim()) {
      setFormError("X username and nickname required.");
      return;
    }
    try {
      setTxPurpose("profile");
      await writeContractAsync({
        address: ARCTECTIVE_CONTRACT_ADDRESS,
        abi: ARCTECTIVE_ABI,
        functionName: "createProfile",
        args: [
          form.x.replace("@", ""),
          form.nickname,
          avatarURI,
          form.motto || "Receipts remember.",
        ],
      });
    } catch (error) {
      setTxPurpose(null);
      setFormError(error instanceof Error ? error.message : "Transaction failed.");
    }
  }

  function enterCase() {
    setByteLine("First, a fast field drill. Tap the glowing receipt.");
    setTutorialStep(progress.tutorialDone ? 4 : 0);
    setScreen(progress.tutorialDone ? "investigation" : "tutorial");
  }

  function collectClue(clueId: ClueId) {
    const clue = CLUES[clueId];
    setByteLine(clue.byte);
    setLastFound(clueId);
    setProgress((current) => {
      if (current.clues.includes(clueId)) return current;
      return { ...current, clues: [...current.clues, clueId] };
    });
    window.setTimeout(() => setLastFound(null), 1600);
  }

  function placeClue(slot: BoardSlot) {
    if (!selectedClue || progress.placements[slot]) return;
    if (!BOARD_RULES[slot].includes(selectedClue)) {
      setWrongSlot(slot);
      setByteLine("Wrong slot. That clue does not prove this part.");
      window.setTimeout(() => setWrongSlot(null), 450);
      return;
    }
    setProgress((current) => ({
      ...current,
      placements: { ...current.placements, [slot]: selectedClue },
    }));
    setSelectedClue(null);
    setByteLine("Evidence locked.");
  }

  function resetBoard() {
    setProgress((current) => ({ ...current, placements: emptyPlacements() }));
    setSelectedClue(null);
    setByteLine("Board cleared. The receipts are still here.");
  }

  function moveTimeline(index: number, direction: -1 | 1) {
    setProgress((current) => {
      const next = [...current.timeline];
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= next.length) return current;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return { ...current, timeline: next };
    });
  }

  function checkTimeline() {
    const correct = progress.timeline.every(
      (tile, index) => tile === TIMELINE_CORRECT[index],
    );
    if (!correct) {
      setTimelineShake(true);
      setByteLine("Close, but the order still glitches.");
      window.setTimeout(() => setTimelineShake(false), 450);
      return;
    }
    setProgress((current) => ({ ...current, timelineSolved: true }));
    setByteLine("Timeline reconstructed. The case is ready for Arc.");
  }

  async function closeCaseOnArc() {
    if (!address || !canCloseCase) return;
    setFormError("");
    const timestamp = Date.now();
    const evidenceHash = `arctective-case-1-final-receipt-${address}-${timestamp}`;
    try {
      setTxPurpose("case");
      await writeContractAsync({
        address: ARCTECTIVE_CONTRACT_ADDRESS,
        abi: ARCTECTIVE_ABI,
        functionName: "solveCase",
        args: [BigInt(CASE_ID), CASE_SCORE, evidenceHash],
      });
    } catch (error) {
      setTxPurpose(null);
      setFormError(error instanceof Error ? error.message : "Case filing failed.");
    }
  }

  function resetLocalCase() {
    setProgress({
      clues: [],
      placements: emptyPlacements(),
      timeline: TIMELINE_START,
      timelineSolved: false,
      tutorialDone: false,
    });
    setSelectedClue(null);
    setByteLine("Case reset. The alley is noisy again.");
  }

  return (
    <GameFrame music={music} sfx={sfx} setMusic={setMusic} setSfx={setSfx}>
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <ScreenPanel key="intro">
            <IntroScreen onStart={() => setScreen("wallet")} />
          </ScreenPanel>
        )}

        {!isConnected && screen !== "intro" && (
          <ScreenPanel key="wallet">
            <WalletScreen
              connectError={connectError?.message}
              connectorsReady={Boolean(connectors[0])}
              walletAvailable={walletAvailable}
              onConnect={() => connect({ connector: connectors[0] })}
            />
          </ScreenPanel>
        )}

        {isConnected && !isArc && (
          <ScreenPanel key="network">
            <NetworkGate address={address} onSwitch={switchToArc} />
          </ScreenPanel>
        )}

        {isConnected && isArc && hasProfile === undefined && (
          <ScreenPanel key="loading-profile">
            <LoadingTerminal text="Reading detective badge from Arc..." />
          </ScreenPanel>
        )}

        {isConnected && isArc && hasProfile === false && screen === "profile" && (
          <ScreenPanel key="profile">
            <ProfileCreation
              address={address}
              avatarURI={avatarURI}
              error={formError}
              form={form}
              pending={isPending || receipt.isLoading}
              setForm={setForm}
              onSubmit={createProfile}
            />
          </ScreenPanel>
        )}

        {isConnected && isArc && screen === "registered" && (
          <ScreenPanel key="registered">
            <RookieBadge txHash={lastTx} onEnter={() => setScreen("hub")} />
          </ScreenPanel>
        )}

        {isConnected && isArc && hasProfile && screen === "hub" && (
          <ScreenPanel key="hub">
            <BureauHub
              address={address}
              badges={badgeNumbers}
              profile={profile}
              solved={solvedCaseNumbers}
              onNavigate={setScreen}
            />
          </ScreenPanel>
        )}

        {screen === "caseDesk" && (
          <ScreenPanel key="case-desk">
            <CaseDesk
              caseSolved={Boolean(hasSolvedCaseOne)}
              onBack={() => setScreen("hub")}
              onStart={enterCase}
            />
          </ScreenPanel>
        )}

        {screen === "tutorial" && (
          <ScreenPanel key="tutorial">
            <TutorialScreen
              step={tutorialStep}
              onStep={setTutorialStep}
              onComplete={() => {
                setProgress((current) => ({ ...current, tutorialDone: true }));
                setByteLine("Good. Now solve the real case.");
                setScreen("investigation");
              }}
            />
          </ScreenPanel>
        )}

        {screen === "investigation" && (
          <ScreenPanel key="investigation">
            <InvestigationScreen
              address={address}
              byteLine={byteLine}
              canOpenBoard={canOpenBoard}
              clues={progress.clues}
              lastFound={lastFound}
              profile={profile}
              onBack={() => setScreen("caseDesk")}
              onBoard={() => setScreen("board")}
              onCollect={collectClue}
            />
          </ScreenPanel>
        )}

        {screen === "board" && (
          <ScreenPanel key="board">
            <EvidenceBoard
              clues={progress.clues}
              placements={progress.placements}
              selectedClue={selectedClue}
              wrongSlot={wrongSlot}
              onBack={() => setScreen("investigation")}
              onPlace={placeClue}
              onReset={resetBoard}
              onSelect={setSelectedClue}
              onTimeline={() => setScreen("timeline")}
            />
          </ScreenPanel>
        )}

        {screen === "timeline" && (
          <ScreenPanel key="timeline">
            <TimelineScreen
              byteLine={byteLine}
              shake={timelineShake}
              solved={progress.timelineSolved}
              tiles={progress.timeline}
              onBack={() => setScreen("board")}
              onCheck={checkTimeline}
              onMove={moveTimeline}
              onReport={() => setScreen("finalReport")}
            />
          </ScreenPanel>
        )}

        {screen === "finalReport" && (
          <ScreenPanel key="final-report">
            <FinalReport
              error={formError}
              pending={isPending || receipt.isLoading}
              profile={profile}
              onBack={() => setScreen("timeline")}
              onClose={closeCaseOnArc}
            />
          </ScreenPanel>
        )}

        {screen === "closed" && (
          <ScreenPanel key="closed">
            <CaseClosed
              profile={profile}
              txHash={lastTx || txHash || ""}
              onHub={() => setScreen("hub")}
            />
          </ScreenPanel>
        )}

        {screen === "profileView" && (
          <ScreenPanel key="profile-view">
            <ProfileScreen
              address={address}
              badges={badgeNumbers}
              profile={profile}
              solved={solvedCaseNumbers}
              onBack={() => setScreen("hub")}
            />
          </ScreenPanel>
        )}

        {screen === "leaderboard" && (
          <ScreenPanel key="leaderboard">
            <LeaderboardScreen
              leaderboard={(leaderboard ?? []) as readonly DetectiveProfile[]}
              onBack={() => setScreen("hub")}
            />
          </ScreenPanel>
        )}

        {screen === "archive" && (
          <ScreenPanel key="archive">
            <ArchiveScreen
              caseSolved={Boolean(hasSolvedCaseOne)}
              onBack={() => setScreen("hub")}
            />
          </ScreenPanel>
        )}

        {screen === "arcTerminal" && (
          <ScreenPanel key="arc-terminal">
            <ArcTerminalScreen onBack={() => setScreen("hub")} />
          </ScreenPanel>
        )}
      </AnimatePresence>
      <button className="debug-reset" onClick={resetLocalCase} title="Reset local case">
        <RotateCcw size={14} />
      </button>
    </GameFrame>
  );
}

function GameFrame({
  children,
  music,
  sfx,
  setMusic,
  setSfx,
}: {
  children: React.ReactNode;
  music: boolean;
  sfx: boolean;
  setMusic(value: boolean): void;
  setSfx(value: boolean): void;
}) {
  return (
    <main className="crt game-root">
      <Rain />
      <div className="city-backdrop" />
      <div className="steam steam-one" />
      <div className="steam steam-two" />
      <div className="sound-rack">
        <button className="sound-button" onClick={() => setMusic(!music)} title="Music">
          {music ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button className="sound-button" onClick={() => setSfx(!sfx)} title="SFX">
          {sfx ? <Radio size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <div className="game-shell">{children}</div>
    </main>
  );
}

function Rain() {
  return (
    <div className="rain-field">
      {Array.from({ length: 48 }).map((_, index) => (
        <span
          className="rain-drop"
          key={index}
          style={{
            left: `${(index * 31) % 100}%`,
            animationDelay: `${(index % 13) * 0.13}s`,
            animationDuration: `${0.75 + (index % 6) * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}

function ScreenPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0)" }}
      exit={{ opacity: 0, scale: 1.01, filter: "blur(4px)" }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.section>
  );
}

function PixelPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`pixel-panel ${className}`}>{children}</div>;
}

function IntroScreen({ onStart }: { onStart(): void }) {
  return (
    <div className="intro-screen">
      <div className="office-hero">
        <MaraPortrait />
        <ByteDrone />
        <div className="office-title">
          <span>ARCTECTIVE</span>
          <h1>The Final Receipt</h1>
          <p>Arc City disputes end where final receipts begin.</p>
        </div>
        <button className="pixel-button start-button" onClick={onStart}>
          <Fingerprint size={18} />
          Start Investigation
        </button>
      </div>
      <PixelPanel className="intro-brief">
        <p className="kicker">Chief Mara Voss</p>
        <h2>People lie. Systems fail. Receipts remember.</h2>
        <p>Connect, register, inspect the alley, and close Case 1 on Arc.</p>
      </PixelPanel>
    </div>
  );
}

function WalletScreen({
  connectError,
  connectorsReady,
  walletAvailable,
  onConnect,
}: {
  connectError?: string;
  connectorsReady: boolean;
  walletAvailable: boolean;
  onConnect(): void;
}) {
  return (
    <div className="gate-layout">
      <PixelPanel className="terminal-card">
        <p className="kicker">Arc Detective Bureau</p>
        <h1>Wallet Checkpoint</h1>
        <div className="terminal-readout">
          <p>&gt; injected wallet: {walletAvailable ? "detected" : "missing"}</p>
          <p>&gt; target chain: Arc Testnet / 5042002</p>
          <p>&gt; native gas: USDC</p>
        </div>
        <button
          className="pixel-button"
          disabled={!walletAvailable || !connectorsReady}
          onClick={onConnect}
        >
          <Fingerprint size={18} />
          Connect Wallet
        </button>
        {!walletAvailable && (
          <p className="microcopy">
            Open in a wallet-enabled browser or enable your wallet extension.
          </p>
        )}
        {connectError && <p className="error-line">{connectError}</p>}
      </PixelPanel>
      <div className="mini-office">
        <ByteDrone />
        <div className="neon-sign">USDC GAS / ARC FINALITY</div>
      </div>
    </div>
  );
}

function NetworkGate({
  address,
  onSwitch,
}: {
  address?: string;
  onSwitch(): void;
}) {
  return (
    <div className="gate-layout">
      <PixelPanel className="terminal-card">
        <p className="kicker">Wrong Network</p>
        <h1>Switch to Arc Testnet</h1>
        <div className="terminal-readout">
          <p>&gt; wallet: {shortAddress(address)}</p>
          <p>&gt; required chain: 5042002</p>
          <p>&gt; explorer: testnet.arcscan.app</p>
        </div>
        <button className="pixel-button" onClick={onSwitch}>
          <CircleDollarSign size={18} />
          Switch to Arc Testnet
        </button>
      </PixelPanel>
    </div>
  );
}

function LoadingTerminal({ text }: { text: string }) {
  return (
    <div className="gate-layout">
      <PixelPanel className="terminal-card">
        <p className="kicker">Bureau Terminal</p>
        <h1>{text}</h1>
        <div className="loading-pulse" />
      </PixelPanel>
    </div>
  );
}

function ProfileCreation({
  address,
  avatarURI,
  error,
  form,
  pending,
  setForm,
  onSubmit,
}: {
  address?: string;
  avatarURI: string;
  error: string;
  form: { x: string; nickname: string; motto: string };
  pending: boolean;
  setForm(value: { x: string; nickname: string; motto: string }): void;
  onSubmit(event: FormEvent): void;
}) {
  return (
    <div className="registration-layout">
      <PixelPanel className="terminal-card">
        <p className="kicker">Arc Detective Bureau Registration</p>
        <h1>Register Detective Badge</h1>
        <form className="terminal-form" onSubmit={onSubmit}>
          <Field
            label="X username"
            placeholder="nxrskyaa"
            value={form.x}
            onChange={(x) => setForm({ ...form, x })}
          />
          <Field
            label="Detective nickname"
            placeholder="Receipt Hunter"
            value={form.nickname}
            onChange={(nickname) => setForm({ ...form, nickname })}
          />
          <Field
            label="Motto / title"
            placeholder="Receipts remember."
            value={form.motto}
            onChange={(motto) => setForm({ ...form, motto })}
          />
          {error && <p className="error-line">{error}</p>}
          <button className="pixel-button amber" disabled={pending}>
            <BadgeCheck size={18} />
            {pending ? "Registering..." : "Register Detective Badge"}
          </button>
        </form>
      </PixelPanel>
      <div className="badge-preview">
        <p>Arc City Bureau</p>
        <Avatar uri={avatarURI} fallback={form.x || address || "AD"} large />
        <h2>{form.nickname || "Rookie Arctective"}</h2>
        <span>@{form.x || "username"}</span>
        <small>{shortAddress(address)}</small>
        <em>{form.motto || "Receipts remember."}</em>
        <strong>Rookie Arctective</strong>
      </div>
    </div>
  );
}

function RookieBadge({ txHash, onEnter }: { txHash: string; onEnter(): void }) {
  return (
    <div className="center-stage">
      <PixelPanel className="success-card">
        <motion.div
          className="case-stamp"
          initial={{ opacity: 0, scale: 2, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
        >
          Rookie Arctective Registered
        </motion.div>
        {txHash && (
          <a href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}`} target="_blank">
            View registration on ArcScan
          </a>
        )}
        <button className="pixel-button" onClick={onEnter}>
          Enter Bureau
        </button>
      </PixelPanel>
    </div>
  );
}

function BureauHub({
  address,
  badges,
  profile,
  solved,
  onNavigate,
}: {
  address?: string;
  badges: number[];
  profile?: DetectiveProfile;
  solved: number[];
  onNavigate(screen: Screen): void;
}) {
  const zones = [
    { label: "Case Desk", screen: "caseDesk" as Screen, Icon: BriefcaseBusiness },
    { label: "Evidence Board", screen: "board" as Screen, Icon: ClipboardCheck },
    { label: "Arc Terminal", screen: "arcTerminal" as Screen, Icon: Terminal },
    { label: "Profile Badge", screen: "profileView" as Screen, Icon: UserRound },
    { label: "Leaderboard", screen: "leaderboard" as Screen, Icon: Trophy },
    { label: "Archive", screen: "archive" as Screen, Icon: BookOpen },
  ];

  return (
    <div>
      <GameTopBar
        address={address}
        location="Arc Detective Bureau"
        profile={profile}
      />
      <div className="hub-grid">
        <ObjectivePanel
          clues={0}
          phase="bureau"
          boardSolved={false}
          timelineSolved={false}
        />
        <div className="bureau-map">
          <MaraPortrait />
          <ByteDrone />
          <div className="bureau-window" />
          {zones.map(({ label, screen, Icon }, index) => (
            <button
              className={`bureau-zone bureau-zone-${index}`}
              key={label}
              onClick={() => onNavigate(screen)}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <BytePanel line="Case 1 is active. Open the Case Desk." />
      </div>
      <EvidenceTray clues={[]} selected={null} used={[]} onSelect={() => null} />
      <div className="profile-strip">
        <Avatar uri={profile?.avatarURI} fallback={profile?.nickname ?? "A"} />
        <strong>{profile?.nickname ?? "Detective"}</strong>
        <span>@{profile?.xUsername ?? "unknown"}</span>
        <span>{rankTitle(profile?.reputation)}</span>
        <span>{solved.length} cases</span>
        <span>{badges.length} badges</span>
      </div>
    </div>
  );
}

function CaseDesk({
  caseSolved,
  onBack,
  onStart,
}: {
  caseSolved: boolean;
  onBack(): void;
  onStart(): void;
}) {
  return (
    <div>
      <BackBar title="Case Desk" onBack={onBack} />
      <div className="case-desk-layout">
        <div className="case-folder playable">
          <span>CASE 01</span>
          <h1>{CASE_TITLE}</h1>
          <p>Merchant terminal says pending. Receipt says final.</p>
          <button className="pixel-button" onClick={onStart}>
            {caseSolved ? "Review Investigation" : "Start Case"}
          </button>
        </div>
        <div className="case-folder locked">
          <span>CASE 02</span>
          <h2>The Agent Who Paid Twice</h2>
          <p>Locked until Case 1 is polished.</p>
        </div>
        <div className="case-folder locked">
          <span>CASE 03</span>
          <h2>The Private Ledger Room</h2>
          <p>Locked until Case 1 is polished.</p>
        </div>
      </div>
    </div>
  );
}

function TutorialScreen({
  step,
  onStep,
  onComplete,
}: {
  step: number;
  onStep(step: number): void;
  onComplete(): void;
}) {
  const lines = [
    "Tap glowing objects to inspect them.",
    "Clues slide into your evidence tray.",
    "Open evidence when you build the case.",
    "Place clues where they belong.",
    "Good. Now solve the real case.",
  ];

  return (
    <div>
      <BackBar title="Byte Field Drill" onBack={onComplete} />
      <div className="tutorial-grid">
        <div className="tutorial-scene">
          <ByteDrone />
          <button
            className={`tutorial-receipt ${step === 0 ? "targeted" : "collected"}`}
            onClick={() => onStep(Math.max(step, 1))}
          >
            <ReceiptText size={28} />
          </button>
          <div className={`tutorial-tray ${step >= 1 ? "lit" : ""}`}>
            Evidence Tray
          </div>
          <div className={`tutorial-board ${step >= 3 ? "lit" : ""}`}>
            Payment Trail
          </div>
        </div>
        <PixelPanel className="tutorial-panel">
          <ByteDrone small />
          <p className="kicker">Byte Tutorial</p>
          <h1>{lines[Math.min(step, lines.length - 1)]}</h1>
          {step === 0 && <p>Click the receipt on the desk.</p>}
          {step === 1 && (
            <button className="pixel-button" onClick={() => onStep(2)}>
              View Evidence Tray
            </button>
          )}
          {step === 2 && (
            <button className="pixel-button" onClick={() => onStep(3)}>
              Open Board
            </button>
          )}
          {step === 3 && (
            <button className="pixel-button" onClick={() => onStep(4)}>
              Place Tutorial Clue
            </button>
          )}
          {step >= 4 && (
            <button className="pixel-button amber" onClick={onComplete}>
              Start Real Case
            </button>
          )}
        </PixelPanel>
      </div>
    </div>
  );
}

function InvestigationScreen({
  address,
  byteLine,
  canOpenBoard,
  clues,
  lastFound,
  profile,
  onBack,
  onBoard,
  onCollect,
}: {
  address?: string;
  byteLine: string;
  canOpenBoard: boolean;
  clues: ClueId[];
  lastFound: ClueId | null;
  profile?: DetectiveProfile;
  onBack(): void;
  onBoard(): void;
  onCollect(clue: ClueId): void;
}) {
  return (
    <div>
      <GameTopBar address={address} location={CASE_TITLE} profile={profile} />
      <div className="gameplay-layout">
        <ObjectivePanel
          boardSolved={false}
          clues={clues.length}
          phase="investigation"
          timelineSolved={false}
        />
        <MerchantScene clues={clues} lastFound={lastFound} onCollect={onCollect} />
        <BytePanel
          line={byteLine}
          action={
            <button className="pixel-button" disabled={!canOpenBoard} onClick={onBoard}>
              Open Evidence Board
            </button>
          }
        />
      </div>
      <EvidenceTray clues={clues} selected={null} used={[]} onSelect={() => null} />
      <button className="back-button floating-back" onClick={onBack}>
        Case Desk
      </button>
    </div>
  );
}

function MerchantScene({
  clues,
  lastFound,
  onCollect,
}: {
  clues: ClueId[];
  lastFound: ClueId | null;
  onCollect(clue: ClueId): void;
}) {
  return (
    <div className="scene-viewport">
      <div className="alley-window">
        <span>ARC PAY / USDC</span>
      </div>
      <div className="merchant-counter" />
      <div className="juno-sprite">
        <div className="juno-head" />
        <div className="juno-apron" />
        <div className="juno-scanner" />
        <small>Juno Pay</small>
      </div>
      <div className="detective-sprite">
        <div className="detective-hat" />
        <div className="detective-coat" />
        <div className="arc-badge" />
      </div>
      <div className="npc-silhouette" />
      <div className="rain-window-lines" />
      {HOTSPOTS.map(({ id, label, clue, className, Icon }) => {
        const inspected = clues.includes(clue);
        return (
          <motion.button
            className={`scene-hotspot ${className} ${inspected ? "inspected" : ""}`}
            key={id}
            whileTap={{ scale: 0.92 }}
            onClick={() => onCollect(clue)}
          >
            <Icon size={18} />
            <span>{inspected ? "Checked" : label}</span>
            {inspected && <Check size={14} />}
          </motion.button>
        );
      })}
      <AnimatePresence>
        {lastFound && (
          <motion.div
            className="clue-reveal"
            initial={{ opacity: 0, y: 28, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <span>{CLUES[lastFound].icon}</span>
            <strong>{CLUES[lastFound].title}</strong>
            <small>{CLUES[lastFound].text}</small>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvidenceBoard({
  clues,
  placements,
  selectedClue,
  wrongSlot,
  onBack,
  onPlace,
  onReset,
  onSelect,
  onTimeline,
}: {
  clues: ClueId[];
  placements: Record<BoardSlot, ClueId | null>;
  selectedClue: ClueId | null;
  wrongSlot: BoardSlot | null;
  onBack(): void;
  onPlace(slot: BoardSlot): void;
  onReset(): void;
  onSelect(clue: ClueId): void;
  onTimeline(): void;
}) {
  const used = Object.values(placements).filter(Boolean) as ClueId[];
  const boardSolved = BOARD_SLOTS.every((slot) => placements[slot]);

  return (
    <div>
      <BackBar title="Evidence Board" onBack={onBack} />
      <div className="board-game-layout">
        <ObjectivePanel
          boardSolved={boardSolved}
          clues={clues.length}
          phase="board"
          timelineSolved={false}
        />
        <div className="cork-board">
          <div className="board-strings" />
          {BOARD_SLOTS.map((slot) => {
            const clue = placements[slot];
            return (
              <button
                className={`case-slot ${clue ? "locked" : ""} ${
                  wrongSlot === slot ? "shake" : ""
                }`}
                key={slot}
                onClick={() => onPlace(slot)}
              >
                <span>{slot}</span>
                {clue ? (
                  <strong>{CLUES[clue].title}</strong>
                ) : (
                  <small>{selectedClue ? "Place selected clue" : "Select clue first"}</small>
                )}
              </button>
            );
          })}
        </div>
        <BytePanel
          line={
            boardSolved
              ? "Board solved. Reconstruct the timeline."
              : selectedClue
                ? `${CLUES[selectedClue].title} selected. Pick a slot.`
                : "Select a clue, then tap a board slot."
          }
          action={
            <div className="stack-actions">
              <button className="pixel-button" disabled={!boardSolved} onClick={onTimeline}>
                Reconstruct Case
              </button>
              <button className="back-button" onClick={onReset}>
                Clear Board
              </button>
            </div>
          }
        />
      </div>
      <EvidenceTray clues={clues} selected={selectedClue} used={used} onSelect={onSelect} />
    </div>
  );
}

function TimelineScreen({
  byteLine,
  shake,
  solved,
  tiles,
  onBack,
  onCheck,
  onMove,
  onReport,
}: {
  byteLine: string;
  shake: boolean;
  solved: boolean;
  tiles: string[];
  onBack(): void;
  onCheck(): void;
  onMove(index: number, direction: -1 | 1): void;
  onReport(): void;
}) {
  return (
    <div>
      <BackBar title="Timeline Reconstruction" onBack={onBack} />
      <div className="timeline-layout">
        <ObjectivePanel
          boardSolved
          clues={6}
          phase="timeline"
          timelineSolved={solved}
        />
        <div className={`timeline-machine ${shake ? "shake" : ""}`}>
          {tiles.map((tile, index) => (
            <div className={`timeline-tile ${solved ? "locked" : ""}`} key={tile}>
              <span>0{index + 1}</span>
              <strong>{tile}</strong>
              <div>
                <button className="back-button" onClick={() => onMove(index, -1)}>
                  Up
                </button>
                <button className="back-button" onClick={() => onMove(index, 1)}>
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
        <BytePanel
          line={solved ? "Timeline reconstructed." : byteLine}
          action={
            solved ? (
              <button className="pixel-button amber" onClick={onReport}>
                Open Final Report
              </button>
            ) : (
              <button className="pixel-button" onClick={onCheck}>
                Check Timeline
              </button>
            )
          }
        />
      </div>
    </div>
  );
}

function FinalReport({
  error,
  pending,
  profile,
  onBack,
  onClose,
}: {
  error: string;
  pending: boolean;
  profile?: DetectiveProfile;
  onBack(): void;
  onClose(): void;
}) {
  return (
    <div>
      <BackBar title="Final Case Report" onBack={onBack} />
      <div className="final-report">
        <PixelPanel>
          <p className="kicker">Case Report Ready</p>
          <h1>{CASE_TITLE}</h1>
          <div className="report-grid">
            <span>Payment status</span>
            <strong>Settled</strong>
            <span>Dispute cause</span>
            <strong>Stale merchant backend</strong>
            <span>Final proof</span>
            <strong>Arc settlement timestamp</strong>
            <span>Detective</span>
            <strong>{profile?.nickname ?? "Arctective"}</strong>
          </div>
          {error && <p className="error-line">{error}</p>}
          <button className="pixel-button amber" disabled={pending} onClick={onClose}>
            <ShieldCheck size={18} />
            {pending ? "Filing final receipt on Arc..." : "Close Case on Arc"}
          </button>
        </PixelPanel>
      </div>
    </div>
  );
}

function CaseClosed({
  profile,
  txHash,
  onHub,
}: {
  profile?: DetectiveProfile;
  txHash: string;
  onHub(): void;
}) {
  return (
    <div className="center-stage">
      <PixelPanel className="case-closed-card">
        <motion.div
          className="case-stamp"
          initial={{ opacity: 0, scale: 2, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
        >
          CASE CLOSED ON ARC
        </motion.div>
        <div className="closed-profile">
          <Avatar uri={profile?.avatarURI} fallback={profile?.nickname ?? "A"} />
          <div>
            <p>Detective</p>
            <strong>{profile?.nickname ?? "Arctective"}</strong>
          </div>
        </div>
        <div className="share-card">
          <p>ARCTECTIVE CASE CLOSED</p>
          <strong>{CASE_TITLE}</strong>
          <span>Payment was settled. Merchant terminal was stale.</span>
          <em>Badge unlocked: {badgeNames[ARCTECTIVE_BADGES.FINAL_RECEIPT_FOUND]}</em>
        </div>
        {txHash && (
          <a href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}`} target="_blank">
            Arc Proof: {shortAddress(txHash)}
          </a>
        )}
        <div className="closed-actions">
          <button className="pixel-button" onClick={onHub}>
            Return to Bureau
          </button>
          <button className="back-button">Share Case Card</button>
        </div>
      </PixelPanel>
    </div>
  );
}

function GameTopBar({
  address,
  location,
  profile,
}: {
  address?: string;
  location: string;
  profile?: DetectiveProfile;
}) {
  return (
    <div className="top-status-bar">
      <strong>ARCTECTIVE</strong>
      <span>{location}</span>
      <span>Arc Testnet</span>
      <span>{shortAddress(address)}</span>
      <span>{Number(profile?.reputation ?? 0)} REP</span>
    </div>
  );
}

function ObjectivePanel({
  boardSolved,
  clues,
  phase,
  timelineSolved,
}: {
  boardSolved: boolean;
  clues: number;
  phase: "bureau" | "investigation" | "board" | "timeline";
  timelineSolved: boolean;
}) {
  const items = [
    { label: "Inspect scene", done: phase !== "bureau" && clues > 0 },
    { label: "Collect 4 clues", done: clues >= 4 },
    { label: "Open board", done: phase === "board" || phase === "timeline" },
    { label: "Reconstruct timeline", done: timelineSolved },
    { label: "Close case on Arc", done: false },
  ];
  return (
    <aside className="objective-panel">
      <p className="kicker">Objectives</p>
      <strong>{clues}/6 clues</strong>
      {items.map((item) => (
        <div className={item.done ? "done" : ""} key={item.label}>
          <span>{item.done ? "✓" : "□"}</span>
          {item.label}
        </div>
      ))}
      {boardSolved && <small>Board locked. Timeline unlocked.</small>}
    </aside>
  );
}

function BytePanel({
  line,
  action,
}: {
  line: string;
  action?: React.ReactNode;
}) {
  return (
    <aside className="byte-panel">
      <ByteDrone />
      <p className="kicker">Hint</p>
      <strong>{line}</strong>
      {action && <div className="byte-action">{action}</div>}
    </aside>
  );
}

function EvidenceTray({
  clues,
  selected,
  used,
  onSelect,
}: {
  clues: ClueId[];
  selected: ClueId | null;
  used: ClueId[];
  onSelect(clue: ClueId): void;
}) {
  return (
    <div className="evidence-tray">
      <span>Evidence Tray</span>
      {clues.length === 0 && <small>No clues yet.</small>}
      {clues.map((clueId) => {
        const clue = CLUES[clueId];
        return (
          <button
            className={`tray-card ${selected === clueId ? "selected" : ""} ${
              used.includes(clueId) ? "used" : ""
            }`}
            key={clueId}
            onClick={() => onSelect(clueId)}
          >
            <em>{clue.icon}</em>
            <strong>{clue.title}</strong>
            <small>{used.includes(clueId) ? "used" : "new"}</small>
          </button>
        );
      })}
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack(): void }) {
  return (
    <div className="backbar">
      <button className="back-button" onClick={onBack}>
        Back
      </button>
      <strong>{title}</strong>
    </div>
  );
}

function ProfileScreen({
  address,
  badges,
  profile,
  solved,
  onBack,
}: {
  address?: string;
  badges: number[];
  profile?: DetectiveProfile;
  solved: number[];
  onBack(): void;
}) {
  return (
    <div>
      <BackBar title="Profile Badge" onBack={onBack} />
      <div className="badge-preview profile-view">
        <Avatar uri={profile?.avatarURI} fallback={profile?.nickname ?? address ?? "A"} large />
        <h2>{profile?.nickname ?? "Detective"}</h2>
        <span>@{profile?.xUsername ?? "unknown"}</span>
        <small>{shortAddress(address)}</small>
        <em>{profile?.motto ?? "Receipts remember."}</em>
        <strong>{rankTitle(profile?.reputation)}</strong>
        <div className="profile-metrics">
          <span>{Number(profile?.reputation ?? 0)} REP</span>
          <span>{solved.length} cases</span>
          <span>{badges.length} badges</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardScreen({
  leaderboard,
  onBack,
}: {
  leaderboard: readonly DetectiveProfile[];
  onBack(): void;
}) {
  return (
    <div>
      <BackBar title="Leaderboard" onBack={onBack} />
      <PixelPanel>
        <div className="leader-list">
          {leaderboard.length ? (
            leaderboard.map((detective, index) => (
              <div className="leader-row" key={`${detective.wallet}-${index}`}>
                <span>#{index + 1}</span>
                <Avatar uri={detective.avatarURI} fallback={detective.nickname} />
                <strong>{detective.nickname}</strong>
                <em>{Number(detective.reputation)} REP</em>
              </div>
            ))
          ) : (
            <p className="microcopy">No detectives returned yet.</p>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}

function ArchiveScreen({
  caseSolved,
  onBack,
}: {
  caseSolved: boolean;
  onBack(): void;
}) {
  return (
    <div>
      <BackBar title="Archive" onBack={onBack} />
      <div className="case-desk-layout">
        <div className="case-folder playable">
          <span>CASE 01</span>
          <h1>{CASE_TITLE}</h1>
          <p>{caseSolved ? "Closed on Arc." : "Still open."}</p>
        </div>
      </div>
    </div>
  );
}

function ArcTerminalScreen({ onBack }: { onBack(): void }) {
  return (
    <div>
      <BackBar title="Arc Terminal" onBack={onBack} />
      <PixelPanel className="terminal-card">
        <div className="terminal-readout">
          <p>&gt; network: Arc Testnet</p>
          <p>&gt; chain_id: 5042002</p>
          <p>&gt; gas: USDC</p>
          <p>&gt; finality: deterministic</p>
          <p>&gt; casebook: {ARCTECTIVE_CONTRACT_ADDRESS}</p>
        </div>
      </PixelPanel>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        className="terminal-input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Avatar({
  fallback,
  large = false,
  uri,
}: {
  fallback: string;
  large?: boolean;
  uri?: string;
}) {
  return (
    <div className={large ? "avatar avatar-large" : "avatar"}>
      {uri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uri} alt="" onError={(event) => (event.currentTarget.style.display = "none")} />
      )}
      <span>{fallback.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function ByteDrone({ small = false }: { small?: boolean }) {
  return (
    <motion.div
      className={small ? "byte-drone small" : "byte-drone"}
      animate={{ y: [0, -8, 0], rotate: [0, 2, -1, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="byte-eye">••</div>
    </motion.div>
  );
}

function MaraPortrait() {
  return (
    <div className="mara-portrait">
      <div className="mara-hair" />
      <div className="mara-face" />
      <div className="mara-coat" />
      <div className="monocle" />
      <span>Mara Voss</span>
    </div>
  );
}
