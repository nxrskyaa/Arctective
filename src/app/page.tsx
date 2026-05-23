"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  CircleDollarSign,
  Fingerprint,
  Radio,
  ShieldCheck,
  Volume2,
  VolumeX,
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
  ARCTECTIVE_CASES,
  ARCTECTIVE_CONTRACT_ADDRESS,
  DetectiveProfile,
  shortAddress,
} from "@/lib/arctective";

type ClueId =
  | "buyer-receipt"
  | "merchant-terminal-log"
  | "invoice-id"
  | "wallet-trail"
  | "arc-settlement-timestamp"
  | "stale-backend-warning";

type HotspotId =
  | "terminal"
  | "printer"
  | "invoice"
  | "scanner"
  | "server"
  | "monitor"
  | "juno";

type GamePhase = "investigate" | "contradiction" | "trace" | "repair" | "ready";

type Clue = {
  id: ClueId;
  title: string;
  icon: string;
  source: HotspotId;
  hint: string;
  x: number;
};

type Hotspot = {
  id: HotspotId;
  label: string;
  clue?: ClueId;
  x: number;
  className: string;
};

const CLUES: Record<ClueId, Clue> = {
  "buyer-receipt": {
    id: "buyer-receipt",
    title: "Buyer Receipt",
    icon: "RCPT",
    source: "printer",
    hint: "Receipt printed. It has a final timestamp.",
    x: 35,
  },
  "merchant-terminal-log": {
    id: "merchant-terminal-log",
    title: "Terminal Log",
    icon: "TERM",
    source: "terminal",
    hint: "Terminal says pending. The timestamp is stale.",
    x: 58,
  },
  "invoice-id": {
    id: "invoice-id",
    title: "Invoice ID",
    icon: "INV",
    source: "invoice",
    hint: "Invoice matches both records.",
    x: 48,
  },
  "wallet-trail": {
    id: "wallet-trail",
    title: "Wallet Trail",
    icon: "0x",
    source: "scanner",
    hint: "Buyer wallet paid once.",
    x: 68,
  },
  "arc-settlement-timestamp": {
    id: "arc-settlement-timestamp",
    title: "Arc Timestamp",
    icon: "ARC",
    source: "monitor",
    hint: "Arc finalized the settlement.",
    x: 76,
  },
  "stale-backend-warning": {
    id: "stale-backend-warning",
    title: "Sync Warning",
    icon: "SYNC",
    source: "server",
    hint: "Backend sync failed before the terminal refreshed.",
    x: 84,
  },
};

const HOTSPOTS: Hotspot[] = [
  { id: "printer", label: "Receipt Printer", clue: "buyer-receipt", x: 35, className: "obj-printer" },
  { id: "terminal", label: "Payment Terminal", clue: "merchant-terminal-log", x: 58, className: "obj-terminal" },
  { id: "invoice", label: "Invoice Board", clue: "invoice-id", x: 48, className: "obj-invoice" },
  { id: "scanner", label: "Wallet Scanner", clue: "wallet-trail", x: 68, className: "obj-scanner" },
  { id: "server", label: "Backend Server", clue: "stale-backend-warning", x: 84, className: "obj-server" },
  { id: "monitor", label: "Security Monitor", clue: "arc-settlement-timestamp", x: 76, className: "obj-monitor" },
  { id: "juno", label: "Talk to Juno", x: 23, className: "obj-juno" },
];

const TRACE_NODES = ["Buyer Wallet", "Arc Settlement", "Merchant Wallet", "Merchant Terminal"];
const REPAIR_SEQUENCE = [2, 0, 3, 1];
const CASE_SCORE = 96;

function hasInjectedWallet() {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

function initialClues() {
  if (typeof window === "undefined") return [] as ClueId[];
  try {
    return JSON.parse(window.localStorage.getItem("arctective-foundation-clues") ?? "[]") as ClueId[];
  } catch {
    return [];
  }
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const [walletAvailable, setWalletAvailable] = useState(() => hasInjectedWallet());
  const [music, setMusic] = useState(false);
  const [sfx, setSfx] = useState(true);
  const [form, setForm] = useState({ x: "", nickname: "", motto: "" });
  const [showBadgeTerminal, setShowBadgeTerminal] = useState(false);
  const [formError, setFormError] = useState("");
  const [clues, setClues] = useState<ClueId[]>(() => initialClues());
  const [phase, setPhase] = useState<GamePhase>("investigate");
  const [playerX, setPlayerX] = useState(14);
  const [playerState, setPlayerState] = useState<"idle" | "walk" | "inspect">("idle");
  const [byteLine, setByteLine] = useState("Tap glowing objects to inspect.");
  const [lastClue, setLastClue] = useState<ClueId | null>(null);
  const [selectedClue, setSelectedClue] = useState<ClueId | null>(null);
  const [junoMood, setJunoMood] = useState<"worried" | "surprised">("worried");
  const [flash, setFlash] = useState(false);
  const [traceIndex, setTraceIndex] = useState(0);
  const [repairInput, setRepairInput] = useState<number[]>([]);
  const [caseReady, setCaseReady] = useState(false);
  const [lastTx, setLastTx] = useState("");
  const [txPurpose, setTxPurpose] = useState<"profile" | "case" | null>(null);

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

  const { data: caseAlreadySolved, refetch: refetchCaseSolved } = useReadContract({
    address: ARCTECTIVE_CONTRACT_ADDRESS,
    abi: ARCTECTIVE_ABI,
    functionName: "hasSolvedCase",
    args: address ? [address, BigInt(ARCTECTIVE_CASES.FINAL_RECEIPT)] : undefined,
    query: { enabled: Boolean(address && isArc && hasProfile) },
  });

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const profile = profileData as DetectiveProfile | undefined;
  const reputation = Number(profile?.reputation ?? 0);
  const solvedCount = useMemo(
    () => ((solvedIds ?? []) as readonly bigint[]).length,
    [solvedIds],
  );
  const gameplayComplete =
    clues.length >= 4 &&
    phase === "ready" &&
    caseReady &&
    traceIndex === TRACE_NODES.length &&
    repairInput.length === REPAIR_SEQUENCE.length;

  useEffect(() => {
    window.localStorage.setItem("arctective-foundation-clues", JSON.stringify(clues));
  }, [clues]);

  useEffect(() => {
    const updateWalletState = () => window.setTimeout(() => setWalletAvailable(hasInjectedWallet()), 0);
    window.addEventListener("ethereum#initialized", updateWalletState, { once: true });
    window.addEventListener("focus", updateWalletState);
    updateWalletState();
    return () => {
      window.removeEventListener("ethereum#initialized", updateWalletState);
      window.removeEventListener("focus", updateWalletState);
    };
  }, []);

  useEffect(() => {
    if (!receipt.isSuccess || !txHash) return;
    window.setTimeout(() => setLastTx(txHash), 0);
    void refetchHasProfile();
    void refetchProfile();
    void refetchSolved();
    void refetchCaseSolved();
    if (txPurpose === "profile") {
      window.setTimeout(() => {
        setShowBadgeTerminal(false);
        setByteLine("Badge registered. Finish the case, then file on Arc.");
      }, 0);
    }
    if (txPurpose === "case") {
      window.setTimeout(
        () => setByteLine("Case filed on Arc. Final receipt locked."),
        0,
      );
    }
  }, [
    receipt.isSuccess,
    refetchCaseSolved,
    refetchHasProfile,
    refetchProfile,
    refetchSolved,
    txHash,
    txPurpose,
  ]);

  async function switchToArc() {
    const ethereum = (window as Window & {
      ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
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
      setFormError(error instanceof Error ? error.message : "Registration failed.");
    }
  }

  function inspectHotspot(hotspot: Hotspot) {
    setPlayerX(hotspot.x);
    setPlayerState("walk");
    window.setTimeout(() => setPlayerState("inspect"), 360);
    window.setTimeout(() => setPlayerState("idle"), 960);

    if (hotspot.id === "juno") {
      if (clues.length >= 4) {
        setPhase("contradiction");
        setByteLine("Present proof that payment arrived.");
      } else {
        setByteLine("Juno is nervous. Collect more clues first.");
      }
      return;
    }

    if (!hotspot.clue) return;
    const clue = CLUES[hotspot.clue];
    setByteLine(clue.hint);
    setLastClue(clue.id);
    setClues((current) =>
      current.includes(clue.id) ? current : [...current, clue.id],
    );
    window.setTimeout(() => setLastClue(null), 1500);
    if (clues.length + 1 >= 4 && phase === "investigate") {
      window.setTimeout(() => setByteLine("Now talk to Juno Pay."), 900);
    }
  }

  function presentContradiction(clueId: ClueId) {
    if (clueId === "buyer-receipt" || clueId === "arc-settlement-timestamp") {
      setFlash(true);
      setJunoMood("surprised");
      setPhase("trace");
      setByteLine("Contradiction found. Trace the receipt path.");
      window.setTimeout(() => setFlash(false), 450);
      return;
    }
    setByteLine("That clue does not break Juno's claim.");
    setSelectedClue(null);
  }

  function clickTraceNode(index: number) {
    if (index !== traceIndex) {
      setTraceIndex(0);
      setByteLine("Trace reset. Start at Buyer Wallet.");
      return;
    }
    const next = traceIndex + 1;
    setTraceIndex(next);
    if (next === TRACE_NODES.length) {
      setPhase("repair");
      setByteLine("Receipt traced. Repair the stale backend sync.");
    }
  }

  function tapRepairModule(index: number) {
    const expected = REPAIR_SEQUENCE[repairInput.length];
    if (index !== expected) {
      setRepairInput([]);
      setByteLine("Wrong module. Watch the amber flicker.");
      return;
    }
    const next = [...repairInput, index];
    setRepairInput(next);
    if (next.length === REPAIR_SEQUENCE.length) {
      setCaseReady(true);
      setPhase("ready");
      setByteLine("Terminal changed to SETTLED. Case ready to file.");
    }
  }

  async function fileOnArc() {
    if (!gameplayComplete) return;
    if (caseAlreadySolved) {
      setByteLine("Case 1 is already filed on Arc.");
      return;
    }
    if (!isConnected || !isArc || !hasProfile) {
      setShowBadgeTerminal(true);
      setByteLine("Gameplay complete. Connect and register before filing on Arc.");
      return;
    }
    const evidenceHash = `arctective-case-1-final-receipt-${address}-${Date.now()}`;
    try {
      setTxPurpose("case");
      setByteLine("Filing final receipt on Arc...");
      await writeContractAsync({
        address: ARCTECTIVE_CONTRACT_ADDRESS,
        abi: ARCTECTIVE_ABI,
        functionName: "solveCase",
        args: [BigInt(ARCTECTIVE_CASES.FINAL_RECEIPT), CASE_SCORE, evidenceHash],
      });
    } catch (error) {
      setTxPurpose(null);
      setByteLine(error instanceof Error ? error.message : "Arc filing failed.");
    }
  }

  return (
    <main className="game-root crt">
      <Rain />
      {flash && <div className="contradiction-flash">CONTRADICTION FOUND</div>}
      <div className="hud">
        <strong>ARCTECTIVE</strong>
        <span>Case 01: The Final Receipt</span>
        <span>{isArc ? "Arc Testnet" : "Wrong Network"}</span>
        <span>{shortAddress(address)}</span>
        <span>{reputation} REP</span>
      </div>

      <div className="game-layout">
        <ObjectivePanel
          caseReady={caseReady}
          clues={clues.length}
          phase={phase}
          solvedCount={solvedCount}
        />

        <section className="shop-stage">
          <RainWindow />
          <div className="neon-shop-sign">JUNO PAY / USDC ACCEPTED</div>
          <div className="wood-floor" />
          <div className="merchant-counter" />
          <JunoPay mood={junoMood} />
          <PlayerDetective x={playerX} state={playerState} />
          <ByteDrone className="byte-in-scene" />
          {HOTSPOTS.map((hotspot) => (
            <HotspotButton
              hotspot={hotspot}
              inspected={Boolean(hotspot.clue && clues.includes(hotspot.clue))}
              key={hotspot.id}
              onClick={() => inspectHotspot(hotspot)}
            />
          ))}
          <AnimatePresence>
            {lastClue && <ClueReveal clue={CLUES[lastClue]} />}
          </AnimatePresence>
          {phase === "contradiction" && (
            <ContradictionCatch
              clues={clues}
              selected={selectedClue}
              onPresent={presentContradiction}
              onSelect={setSelectedClue}
            />
          )}
          {phase === "trace" && (
            <ReceiptTrace traceIndex={traceIndex} onClickNode={clickTraceNode} />
          )}
          {phase === "repair" && (
            <BackendRepair input={repairInput} onTap={tapRepairModule} />
          )}
          {phase === "ready" && (
            <CaseReady
              alreadyFiled={Boolean(caseAlreadySolved)}
              canFile={gameplayComplete}
              hasProfile={Boolean(hasProfile)}
              isConnected={isConnected}
              isOnArc={isArc}
              lastTx={lastTx || txHash || ""}
              pending={isPending || receipt.isLoading}
              onFile={fileOnArc}
            />
          )}
        </section>

        <aside className="byte-panel">
          <ByteDrone />
          <p>BYTE</p>
          <strong>{byteLine}</strong>
          <div className="arc-actions">
            {!isConnected && (
              <button
                className="pixel-button"
                disabled={!walletAvailable || !connectors[0]}
                onClick={() => connect({ connector: connectors[0] })}
              >
                <Fingerprint size={16} />
                Connect Wallet
              </button>
            )}
            {isConnected && !isArc && (
              <button className="pixel-button amber" onClick={switchToArc}>
                <CircleDollarSign size={16} />
                Switch Arc
              </button>
            )}
            {isConnected && isArc && hasProfile === false && (
              <button className="pixel-button amber" onClick={() => setShowBadgeTerminal(true)}>
                <BadgeCheck size={16} />
                Register Badge
              </button>
            )}
          </div>
          {connectError && <small className="error-line">{connectError.message}</small>}
        </aside>
      </div>

      <EvidenceTray clues={clues} selected={selectedClue} onSelect={setSelectedClue} />

      <div className="sound-rack">
        <button className="sound-button" onClick={() => setMusic(!music)} title="Music">
          {music ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button className="sound-button" onClick={() => setSfx(!sfx)} title="SFX">
          {sfx ? <Radio size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {showBadgeTerminal && (
        <BadgeTerminal
          address={address}
          avatarURI={avatarURI}
          error={formError}
          form={form}
          pending={isPending || receipt.isLoading}
          setForm={setForm}
          onClose={() => setShowBadgeTerminal(false)}
          onSubmit={createProfile}
        />
      )}
    </main>
  );
}

function Rain() {
  return (
    <div className="rain-layer">
      {Array.from({ length: 42 }).map((_, index) => (
        <span
          className="rain-drop"
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 11) * 0.14}s`,
          }}
        />
      ))}
    </div>
  );
}

function ObjectivePanel({
  caseReady,
  clues,
  phase,
  solvedCount,
}: {
  caseReady: boolean;
  clues: number;
  phase: GamePhase;
  solvedCount: number;
}) {
  const items = [
    ["Inspect objects", clues > 0],
    ["Collect 4 clues", clues >= 4],
    ["Talk to Juno", phase !== "investigate"],
    ["Catch contradiction", phase === "trace" || phase === "repair" || phase === "ready"],
    ["Trace receipt", phase === "repair" || phase === "ready"],
    ["Repair backend", caseReady],
  ] as const;

  return (
    <aside className="objective-panel">
      <p>Objectives</p>
      <strong>{clues}/6 clues</strong>
      {items.map(([label, done]) => (
        <div className={done ? "done" : ""} key={label}>
          <span>{done ? "✓" : "□"}</span>
          {label}
        </div>
      ))}
      <small>{solvedCount} onchain cases</small>
    </aside>
  );
}

function RainWindow() {
  return (
    <div className="rain-window">
      <span>ARC CITY</span>
      <div className="window-rain" />
    </div>
  );
}

function HotspotButton({
  hotspot,
  inspected,
  onClick,
}: {
  hotspot: Hotspot;
  inspected: boolean;
  onClick(): void;
}) {
  return (
    <button
      className={`hotspot ${hotspot.className} ${inspected ? "inspected" : ""}`}
      onClick={onClick}
    >
      <span>{inspected ? "✓" : hotspot.label}</span>
    </button>
  );
}

function PlayerDetective({
  state,
  x,
}: {
  state: "idle" | "walk" | "inspect";
  x: number;
}) {
  return (
    <motion.div
      animate={{ left: `${x}%` }}
      className={`player-detective ${state}`}
      transition={{ duration: 0.34, ease: "easeInOut" }}
    >
      <div className="detective-hat" />
      <div className="detective-head" />
      <div className="detective-coat" />
      <div className="detective-badge" />
      <div className="detective-glass" />
    </motion.div>
  );
}

function ByteDrone({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -7, 0], rotate: [0, 2, -1, 0] }}
      className={`byte-drone ${className}`}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="byte-face">••</div>
    </motion.div>
  );
}

function JunoPay({ mood }: { mood: "worried" | "surprised" }) {
  return (
    <div className={`juno-pay ${mood}`}>
      <div className="juno-head">
        <span />
      </div>
      <div className="juno-body" />
      <div className="juno-scanner" />
      <small>{mood === "surprised" ? "Wait... settled?" : "It says pending!"}</small>
    </div>
  );
}

function ClueReveal({ clue }: { clue: Clue }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="clue-reveal"
      exit={{ opacity: 0, y: -16 }}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
    >
      <em>{clue.icon}</em>
      <strong>{clue.title}</strong>
      <span>Added to evidence tray</span>
    </motion.div>
  );
}

function EvidenceTray({
  clues,
  selected,
  onSelect,
}: {
  clues: ClueId[];
  selected: ClueId | null;
  onSelect(clue: ClueId): void;
}) {
  return (
    <div className="evidence-tray">
      <span>Evidence Tray</span>
      {clues.length === 0 && <small>No clues yet</small>}
      {clues.map((clueId) => (
        <button
          className={`clue-card ${selected === clueId ? "selected" : ""}`}
          key={clueId}
          onClick={() => onSelect(clueId)}
        >
          <em>{CLUES[clueId].icon}</em>
          <strong>{CLUES[clueId].title}</strong>
        </button>
      ))}
    </div>
  );
}

function ContradictionCatch({
  clues,
  selected,
  onPresent,
  onSelect,
}: {
  clues: ClueId[];
  selected: ClueId | null;
  onPresent(clue: ClueId): void;
  onSelect(clue: ClueId): void;
}) {
  return (
    <div className="mini-modal contradiction">
      <p>Juno says:</p>
      <strong>“My terminal says pending. That means no payment arrived.”</strong>
      <div className="present-row">
        {clues.map((clue) => (
          <button
            className={`clue-card ${selected === clue ? "selected" : ""}`}
            key={clue}
            onClick={() => onSelect(clue)}
          >
            <em>{CLUES[clue].icon}</em>
            <strong>{CLUES[clue].title}</strong>
          </button>
        ))}
      </div>
      <button
        className="pixel-button amber"
        disabled={!selected}
        onClick={() => selected && onPresent(selected)}
      >
        Present Clue
      </button>
    </div>
  );
}

function ReceiptTrace({
  traceIndex,
  onClickNode,
}: {
  traceIndex: number;
  onClickNode(index: number): void;
}) {
  return (
    <div className="mini-modal receipt-trace">
      <p>Receipt Trace</p>
      <div className="trace-nodes">
        {TRACE_NODES.map((node, index) => (
          <button
            className={index < traceIndex ? "lit" : ""}
            key={node}
            onClick={() => onClickNode(index)}
          >
            {node}
          </button>
        ))}
      </div>
    </div>
  );
}

function BackendRepair({
  input,
  onTap,
}: {
  input: number[];
  onTap(index: number): void;
}) {
  return (
    <div className="mini-modal backend-repair">
      <p>Backend Sync Repair</p>
      <small>Tap the amber flicker order.</small>
      <div className="repair-grid">
        {[0, 1, 2, 3].map((module) => (
          <button
            className={`${REPAIR_SEQUENCE[input.length] === module ? "target" : ""} ${
              input.includes(module) ? "done" : ""
            }`}
            key={module}
            onClick={() => onTap(module)}
          >
            MOD {module + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function CaseReady({
  alreadyFiled,
  canFile,
  hasProfile,
  isConnected,
  isOnArc,
  lastTx,
  pending,
  onFile,
}: {
  alreadyFiled: boolean;
  canFile: boolean;
  hasProfile: boolean;
  isConnected: boolean;
  isOnArc: boolean;
  lastTx: string;
  pending: boolean;
  onFile(): void;
}) {
  const actionText = alreadyFiled
    ? "Case Already Filed"
    : !isConnected
      ? "Connect Wallet to File"
      : !isOnArc
        ? "Switch to Arc First"
        : !hasProfile
          ? "Register Badge to File"
          : "File Final Receipt on Arc";

  return (
    <div className="mini-modal case-ready">
      <p>Terminal status changed:</p>
      <strong>SETTLED</strong>
      <small>Gameplay complete: clues, contradiction, trace, backend repair.</small>
      <button
        className="pixel-button amber"
        disabled={pending || !canFile || alreadyFiled}
        onClick={onFile}
      >
        <ShieldCheck size={16} />
        {pending ? "Filing final receipt on Arc..." : actionText}
      </button>
      {lastTx && (
        <a href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${lastTx}`} target="_blank">
          ArcScan: {shortAddress(lastTx)}
        </a>
      )}
    </div>
  );
}

function BadgeTerminal({
  address,
  avatarURI,
  error,
  form,
  pending,
  setForm,
  onClose,
  onSubmit,
}: {
  address?: string;
  avatarURI: string;
  error: string;
  form: { x: string; nickname: string; motto: string };
  pending: boolean;
  setForm(value: { x: string; nickname: string; motto: string }): void;
  onClose(): void;
  onSubmit(event: FormEvent): void;
}) {
  return (
    <div className="badge-overlay">
      <form className="badge-terminal" onSubmit={onSubmit}>
        <button className="close-button" type="button" onClick={onClose}>
          X
        </button>
        <p>Arc Detective Badge</p>
        <div className="badge-preview">
          <Avatar uri={avatarURI} fallback={form.x || address || "AD"} />
          <strong>{form.nickname || "Rookie Arctective"}</strong>
          <span>@{form.x || "username"}</span>
          <small>{shortAddress(address)}</small>
        </div>
        <label>
          X username
          <input
            value={form.x}
            onChange={(event) => setForm({ ...form, x: event.target.value })}
            placeholder="nxrskyaa"
          />
        </label>
        <label>
          Detective nickname
          <input
            value={form.nickname}
            onChange={(event) => setForm({ ...form, nickname: event.target.value })}
            placeholder="Receipt Hunter"
          />
        </label>
        <label>
          Motto
          <input
            value={form.motto}
            onChange={(event) => setForm({ ...form, motto: event.target.value })}
            placeholder="Receipts remember."
          />
        </label>
        {error && <small className="error-line">{error}</small>}
        <button className="pixel-button amber" disabled={pending}>
          {pending ? "Registering..." : "Register Badge"}
        </button>
      </form>
    </div>
  );
}

function Avatar({ fallback, uri }: { fallback: string; uri?: string }) {
  return (
    <div className="avatar">
      {uri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uri} alt="" onError={(event) => (event.currentTarget.style.display = "none")} />
      )}
      <span>{fallback.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
