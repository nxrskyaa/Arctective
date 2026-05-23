"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  Fingerprint,
  Medal,
  Radio,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Terminal,
  Trophy,
  UserRound,
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
  ARCTECTIVE_BADGES,
  ARCTECTIVE_CASES,
  ARCTECTIVE_CONTRACT_ADDRESS,
  DetectiveProfile,
  rankTitle,
  shortAddress,
} from "@/lib/arctective";

type Screen =
  | "cinematic"
  | "wallet"
  | "profile"
  | "registered"
  | "hub"
  | "caseDesk"
  | "case"
  | "board"
  | "terminal"
  | "closed"
  | "profileView"
  | "leaderboard"
  | "archive"
  | "arcTerminal";

type EvidenceSlot =
  | "Suspect"
  | "Payment Trail"
  | "Contradiction"
  | "Root Cause"
  | "Final Proof";

type Evidence = {
  id: string;
  title: string;
  text: string;
  slot: EvidenceSlot;
  icon: string;
};

type CaseFile = {
  id: number;
  title: string;
  theme: string;
  scene: string;
  npc: string;
  npcLine: string;
  lesson: string;
  badge: number;
  score: number;
  briefing: string;
  evidence: Evidence[];
  answers: string[];
};

const CASES: CaseFile[] = [
  {
    id: ARCTECTIVE_CASES.FINAL_RECEIPT,
    title: "The Final Receipt",
    theme: "Payment settlement and deterministic finality",
    scene: "Neon payment alley",
    npc: "Juno Pay",
    npcLine: "My terminal says pending. The buyer keeps waving a receipt.",
    lesson: "Final settlement is evidence.",
    badge: ARCTECTIVE_BADGES.FINAL_RECEIPT_FOUND,
    score: 96,
    briefing:
      "A merchant says a buyer never paid. The receipt says otherwise. Find the stale system before the rumor becomes the truth.",
    evidence: [
      {
        id: "buyer-receipt",
        title: "Buyer Receipt",
        text: "A signed payment receipt with a settled Arc timestamp.",
        slot: "Payment Trail",
        icon: "USDC",
      },
      {
        id: "terminal-log",
        title: "Merchant Terminal Log",
        text: "The terminal cached an old pending status after checkout.",
        slot: "Contradiction",
        icon: "CRT",
      },
      {
        id: "wallet-trail",
        title: "Wallet Trail",
        text: "The buyer wallet paid the invoice once, not twice.",
        slot: "Suspect",
        icon: "0x",
      },
      {
        id: "stale-warning",
        title: "Stale Backend Warning",
        text: "The merchant backend missed the final settlement callback.",
        slot: "Root Cause",
        icon: "ERR",
      },
      {
        id: "arc-finality",
        title: "Arc Settlement Timestamp",
        text: "Sub-second deterministic finality locks the case.",
        slot: "Final Proof",
        icon: "ARC",
      },
    ],
    answers: [
      "payment settled",
      "arc settlement timestamp",
      "merchant backend",
      "deterministic finality",
      "yes",
    ],
  },
  {
    id: ARCTECTIVE_CASES.AGENT_PAID_TWICE,
    title: "The Agent Who Paid Twice",
    theme: "Agentic payments and machine-readable settlement",
    scene: "Automated warehouse",
    npc: "Agent K-77",
    npcLine: "Instruction executed. Twice. Efficiency: 200%.",
    lesson: "Agentic commerce needs fast, final, machine-readable settlement.",
    badge: ARCTECTIVE_BADGES.DOUBLE_PAY_SLAYER,
    score: 91,
    briefing:
      "K-77 retried a payout because its workflow never checked final settlement state before executing again.",
    evidence: [
      {
        id: "invoice-id",
        title: "Invoice ID",
        text: "The same invoice appears on both payment receipts.",
        slot: "Payment Trail",
        icon: "INV",
      },
      {
        id: "receipt-b",
        title: "Payment Receipt B",
        text: "A second transfer fired during the retry window.",
        slot: "Contradiction",
        icon: "B",
      },
      {
        id: "agent-k77",
        title: "Agent K-77",
        text: "The purchasing agent executed duplicate retry logic.",
        slot: "Suspect",
        icon: "AI",
      },
      {
        id: "retry-log",
        title: "Agent Retry Log",
        text: "The workflow ignored settlement proof before retrying.",
        slot: "Root Cause",
        icon: "LOG",
      },
      {
        id: "settlement-state",
        title: "Settlement State",
        text: "A machine-readable final receipt should have stopped payment two.",
        slot: "Final Proof",
        icon: "FIN",
      },
    ],
    answers: [
      "agent paid twice",
      "agent retry log",
      "agent k-77",
      "machine-readable settlement",
      "yes",
    ],
  },
  {
    id: ARCTECTIVE_CASES.PRIVATE_LEDGER,
    title: "The Private Ledger Room",
    theme: "Privacy-aware auditability",
    scene: "Dark privacy vault",
    npc: "Vega Shield",
    npcLine: "A good proof reveals enough. A bad system reveals everything.",
    lesson: "Finance needs both proof and privacy.",
    badge: ARCTECTIVE_BADGES.REDACTION_EXPERT,
    score: 88,
    briefing:
      "Prove a payout happened without leaking supplier identity or private notes.",
    evidence: [
      {
        id: "timestamp",
        title: "Timestamp",
        text: "Reveal the payment time.",
        slot: "Payment Trail",
        icon: "TIME",
      },
      {
        id: "invoice-hash",
        title: "Invoice Hash",
        text: "Reveal the invoice commitment, not the private invoice.",
        slot: "Final Proof",
        icon: "HASH",
      },
      {
        id: "amount-range",
        title: "Amount Range",
        text: "Reveal a bounded amount range.",
        slot: "Contradiction",
        icon: "USDC",
      },
      {
        id: "counterparty-type",
        title: "Counterparty Type",
        text: "A supplier category is enough for the audit.",
        slot: "Suspect",
        icon: "TYPE",
      },
      {
        id: "payout-confirmation",
        title: "Payout Confirmation",
        text: "The payout was confirmed without oversharing identity.",
        slot: "Root Cause",
        icon: "OK",
      },
    ],
    answers: [
      "prove payout privately",
      "invoice hash",
      "privacy auditor",
      "privacy-aware auditability",
      "yes",
    ],
  },
];

const cinematicLines = [
  "Arc City never sleeps.",
  "Not because people are awake.",
  "Because money is.",
  "Before the Bureau, every dispute became a rumor.",
  "Every failed payment became a ghost story.",
  "Every agent mistake became someone else's loss.",
  "Then came the Arctectives.",
  "Investigators trained to read the only evidence that never blinks.",
  "Final settlement.",
  "New Detective Required.",
  "Bind your identity.",
  "Register your badge on Arc.",
];

const slots: EvidenceSlot[] = [
  "Suspect",
  "Payment Trail",
  "Contradiction",
  "Root Cause",
  "Final Proof",
];

const badgeNames: Record<number, string> = {
  1: "Final Receipt Found",
  2: "Double-Pay Slayer",
  3: "Redaction Expert",
  100: "Rookie Arctective",
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const [screen, setScreen] = useState<Screen>("cinematic");
  const [activeCaseId, setActiveCaseId] = useState(1);
  const [discovered, setDiscovered] = useState<Record<number, string[]>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("arctective-progress");
    if (!saved) return {};
    return (
      JSON.parse(saved) as {
        discovered?: Record<number, string[]>;
      }
    ).discovered ?? {};
  });
  const [placements, setPlacements] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const saved = window.localStorage.getItem("arctective-progress");
    if (!saved) return {};
    return (
      JSON.parse(saved) as {
        placements?: Record<string, string>;
      }
    ).placements ?? {};
  });
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [lastTx, setLastTx] = useState<string>("");
  const [music, setMusic] = useState(false);
  const [sfx, setSfx] = useState(true);
  const [form, setForm] = useState({ x: "", nickname: "", motto: "" });
  const [formError, setFormError] = useState("");
  const [lineIndex, setLineIndex] = useState(0);

  const isArc = chainId === ARC_TESTNET.id;
  const activeCase = CASES.find((caseFile) => caseFile.id === activeCaseId) ?? CASES[0];
  const discoveredIds = discovered[activeCase.id] ?? [];
  const correctPlacements = activeCase.evidence.filter(
    (item) => placements[item.slot] === item.id,
  ).length;
  const terminalUnlocked = correctPlacements === slots.length;
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

  useEffect(() => {
    window.localStorage.setItem(
      "arctective-progress",
      JSON.stringify({ discovered, placements }),
    );
  }, [discovered, placements]);

  useEffect(() => {
    if (screen !== "cinematic") return;
    const timer = window.setInterval(() => {
      setLineIndex((current) =>
        current < cinematicLines.length - 1 ? current + 1 : current,
      );
    }, 1500);
    return () => window.clearInterval(timer);
  }, [screen]);

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
    if (screen === "profile") window.setTimeout(() => setScreen("registered"), 0);
    if (screen === "terminal") window.setTimeout(() => setScreen("closed"), 0);
  }, [
    receipt.isSuccess,
    refetchBadges,
    refetchHasProfile,
    refetchProfile,
    refetchSolved,
    screen,
    txHash,
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
      setFormError("X username and detective nickname are required.");
      return;
    }
    try {
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
      setFormError(error instanceof Error ? error.message : "Transaction failed.");
    }
  }

  async function solveCase() {
    if (!address || !terminalUnlocked) return;
    const normalized = answers.map((answer) => answer.trim().toLowerCase());
    const correct = activeCase.answers.every((answer, index) =>
      normalized[index]?.includes(answer),
    );
    if (!correct) {
      setFormError("The terminal rejects the deduction. Recheck the board.");
      return;
    }
    setFormError("");
    // eslint-disable-next-line react-hooks/purity
    const timestamp = Date.now();
    const evidenceHash = `arctective-case-${activeCase.id}-${activeCase.title
      .toLowerCase()
      .replaceAll(" ", "-")}-${address}-${timestamp}`;
    try {
      await writeContractAsync({
        address: ARCTECTIVE_CONTRACT_ADDRESS,
        abi: ARCTECTIVE_ABI,
        functionName: "solveCase",
        args: [BigInt(activeCase.id), activeCase.score, evidenceHash],
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Case proof failed.");
    }
  }

  function discover(evidenceId: string) {
    setDiscovered((current) => {
      const caseItems = current[activeCase.id] ?? [];
      if (caseItems.includes(evidenceId)) return current;
      return { ...current, [activeCase.id]: [...caseItems, evidenceId] };
    });
  }

  function startCase(caseId: number) {
    setActiveCaseId(caseId);
    setAnswers(["", "", "", "", ""]);
    setFormError("");
    setScreen("case");
  }

  if (screen === "cinematic") {
    return (
      <GameFrame music={music} sfx={sfx} setMusic={setMusic} setSfx={setSfx}>
        <OpeningCinematic
          lineIndex={lineIndex}
          onStart={() => setScreen("wallet")}
        />
      </GameFrame>
    );
  }

  return (
    <GameFrame music={music} sfx={sfx} setMusic={setMusic} setSfx={setSfx}>
      <AnimatePresence mode="wait">
        {!isConnected && (
          <ScreenPanel key="wallet">
            <div className="grid min-h-[74vh] gap-6 lg:grid-cols-[1fr_0.8fr]">
              <HeroScene />
              <PixelPanel className="self-center">
                <p className="kicker">New Detective Required</p>
                <h1 className="pixel-title">Bind your badge to Arc.</h1>
                <p className="mt-4 text-sm leading-7 text-cyan-100/80">
                  The Bureau only opens after your wallet connects. USDC is gas.
                  Final receipts are evidence. Reputation lives on Arc Testnet.
                </p>
                <button
                  className="pixel-button mt-6 w-full"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  <Fingerprint size={18} />
                  Connect Wallet
                </button>
                {connectError && (
                  <p className="mt-4 text-xs text-red-300">{connectError.message}</p>
                )}
              </PixelPanel>
            </div>
          </ScreenPanel>
        )}

        {isConnected && !isArc && (
          <ScreenPanel key="network">
            <NetworkGate onSwitch={switchToArc} address={address} />
          </ScreenPanel>
        )}

        {isConnected && isArc && screen === "profile" && (
          <ScreenPanel key="profile">
            <ProfileCreation
              form={form}
              avatarURI={avatarURI}
              setForm={setForm}
              onSubmit={createProfile}
              error={formError}
              pending={isPending || receipt.isLoading}
              address={address}
            />
          </ScreenPanel>
        )}

        {isConnected && isArc && screen === "registered" && (
          <ScreenPanel key="registered">
            <RookieBadge onEnter={() => setScreen("hub")} txHash={lastTx} />
          </ScreenPanel>
        )}

        {isConnected && isArc && hasProfile && screen === "hub" && (
          <ScreenPanel key="hub">
            <BureauHub
              profile={profile}
              onNavigate={setScreen}
              solvedCount={solvedCaseNumbers.length}
            />
          </ScreenPanel>
        )}

        {screen === "caseDesk" && (
          <ScreenPanel key="caseDesk">
            <CaseDesk
              cases={CASES}
              solved={solvedCaseNumbers}
              onBack={() => setScreen("hub")}
              onStart={startCase}
            />
          </ScreenPanel>
        )}

        {screen === "case" && (
          <ScreenPanel key="case">
            <CaseScene
              caseFile={activeCase}
              discoveredIds={discoveredIds}
              solved={solvedCaseNumbers.includes(activeCase.id)}
              onDiscover={discover}
              onBoard={() => setScreen("board")}
              onBack={() => setScreen("caseDesk")}
            />
          </ScreenPanel>
        )}

        {screen === "board" && (
          <ScreenPanel key="board">
            <EvidenceBoard
              caseFile={activeCase}
              discoveredIds={discoveredIds}
              placements={placements}
              correctCount={correctPlacements}
              onPlace={(slot, evidenceId) =>
                setPlacements((current) => ({ ...current, [slot]: evidenceId }))
              }
              onBack={() => setScreen("case")}
              onTerminal={() => setScreen("terminal")}
            />
          </ScreenPanel>
        )}

        {screen === "terminal" && (
          <ScreenPanel key="terminal">
            <DeductionTerminal
              caseFile={activeCase}
              answers={answers}
              setAnswers={setAnswers}
              onBack={() => setScreen("board")}
              onSolve={solveCase}
              pending={isPending || receipt.isLoading}
              error={formError}
            />
          </ScreenPanel>
        )}

        {screen === "closed" && (
          <ScreenPanel key="closed">
            <CaseClosed
              caseFile={activeCase}
              txHash={lastTx || txHash || ""}
              onHub={() => setScreen("hub")}
            />
          </ScreenPanel>
        )}

        {screen === "profileView" && (
          <ScreenPanel key="profileView">
            <ProfileScreen
              profile={profile}
              address={address}
              solved={solvedCaseNumbers}
              badges={badgeNumbers}
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
            <ArchiveScreen solved={solvedCaseNumbers} onBack={() => setScreen("hub")} />
          </ScreenPanel>
        )}

        {screen === "arcTerminal" && (
          <ScreenPanel key="arcTerminal">
            <ArcTerminalScreen onBack={() => setScreen("hub")} />
          </ScreenPanel>
        )}
      </AnimatePresence>
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
    <main className="crt relative min-h-screen overflow-hidden bg-[#03070a] text-cyan-50">
      <Rain />
      <div className="city-backdrop" />
      <div className="steam steam-one" />
      <div className="steam steam-two" />
      <motion.div
        className="byte-drone"
        animate={{ y: [0, -12, 0], rotate: [0, 3, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="byte-eye">::</div>
      </motion.div>
      <div className="fixed right-4 top-4 z-30 flex gap-2">
        <button className="sound-button" onClick={() => setMusic(!music)} title="Music">
          {music ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button className="sound-button" onClick={() => setSfx(!sfx)} title="SFX">
          {sfx ? <Radio size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function Rain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {Array.from({ length: 54 }).map((_, index) => (
        <span
          className="rain-drop"
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 17) * 0.17}s`,
            animationDuration: `${0.8 + (index % 7) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function ScreenPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.01, filter: "blur(6px)" }}
      transition={{ duration: 0.35 }}
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

function OpeningCinematic({
  lineIndex,
  onStart,
}: {
  lineIndex: number;
  onStart(): void;
}) {
  return (
    <div className="grid min-h-[88vh] items-end gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <HeroScene />
      <PixelPanel className="mb-10">
        <div className="mb-5 flex items-center gap-3 text-xs text-cyan-300">
          <Siren size={18} />
          ARC DETECTIVE BUREAU SIGNAL
        </div>
        <AnimatePresence mode="wait">
          <motion.h1
            key={cinematicLines[lineIndex]}
            className="pixel-title min-h-32"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {cinematicLines[lineIndex]}
          </motion.h1>
        </AnimatePresence>
        <button className="pixel-button mt-8 w-full" onClick={onStart}>
          <Search size={18} />
          Start Investigation
        </button>
      </PixelPanel>
    </div>
  );
}

function HeroScene() {
  return (
    <div className="hero-scene min-h-[560px]">
      <div className="moon" />
      <div className="billboard">USDC GAS / ARC FINALITY</div>
      <div className="window-grid" />
      <div className="pixel-car car-one" />
      <div className="pixel-car car-two" />
      <motion.div
        className="mara"
        animate={{ filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }}
        transition={{ duration: 3.4, repeat: Infinity }}
      >
        <div className="mara-hair" />
        <div className="mara-face" />
        <div className="mara-coat" />
        <div className="monocle" />
      </motion.div>
      <div className="briefing-card">
        <p>People lie. Systems fail. Receipts remember.</p>
        <span>Mara Voss</span>
      </div>
    </div>
  );
}

function NetworkGate({
  onSwitch,
  address,
}: {
  onSwitch(): void;
  address?: string;
}) {
  return (
    <div className="mx-auto grid min-h-[78vh] max-w-4xl place-items-center">
      <PixelPanel className="max-w-2xl text-center">
        <Terminal className="mx-auto text-cyan-300" size={42} />
        <h1 className="pixel-title mt-5">Wrong signal. Arc Testnet required.</h1>
        <p className="mt-4 text-sm leading-7 text-cyan-100/75">
          Wallet {shortAddress(address)} is connected, but the Bureau terminal
          only accepts Arc Testnet, chain ID 5042002, with USDC as native gas.
        </p>
        <button className="pixel-button mx-auto mt-7" onClick={onSwitch}>
          <CircleDollarSign size={18} />
          Switch to Arc Testnet
        </button>
      </PixelPanel>
    </div>
  );
}

function ProfileCreation({
  form,
  avatarURI,
  setForm,
  onSubmit,
  pending,
  error,
  address,
}: {
  form: { x: string; nickname: string; motto: string };
  avatarURI: string;
  setForm(value: { x: string; nickname: string; motto: string }): void;
  onSubmit(event: FormEvent): void;
  pending: boolean;
  error: string;
  address?: string;
}) {
  return (
    <div className="mx-auto grid min-h-[78vh] max-w-5xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <PixelPanel>
        <p className="kicker">Detective Profile</p>
        <h1 className="pixel-title">Register your badge on Arc.</h1>
        <p className="mt-4 text-sm leading-7 text-cyan-100/75">
          One profile per wallet. X usernames are unique onchain. Your avatar URI
          points to Unavatar; no images or base64 are stored onchain.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <Avatar uri={avatarURI} fallback={form.x || address || "AD"} />
          <div>
            <p className="font-mono text-xs text-cyan-300">BADGE PREVIEW</p>
            <p className="mt-1 text-lg font-black text-white">
              {form.nickname || "Rookie Arctective"}
            </p>
            <p className="text-sm text-cyan-100/70">@{form.x || "username"}</p>
          </div>
        </div>
      </PixelPanel>
      <PixelPanel>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field
            label="X username"
            value={form.x}
            onChange={(x) => setForm({ ...form, x })}
            placeholder="nxrskyaa"
          />
          <Field
            label="Detective nickname"
            value={form.nickname}
            onChange={(nickname) => setForm({ ...form, nickname })}
            placeholder="Receipt Hunter"
          />
          <Field
            label="Motto / title"
            value={form.motto}
            onChange={(motto) => setForm({ ...form, motto })}
            placeholder="Receipts remember."
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button className="pixel-button w-full" disabled={pending}>
            <BadgeCheck size={18} />
            {pending ? "Registering Badge..." : "Create Detective Profile"}
          </button>
        </form>
      </PixelPanel>
    </div>
  );
}

function RookieBadge({ onEnter, txHash }: { onEnter(): void; txHash: string }) {
  return (
    <div className="mx-auto grid min-h-[78vh] max-w-3xl place-items-center text-center">
      <PixelPanel>
        <motion.div
          className="case-stamp mx-auto"
          initial={{ scale: 2.2, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
        >
          Rookie Arctective Registered
        </motion.div>
        <p className="mt-6 text-cyan-100/75">
          Your badge is now bound to Arc. The Bureau doors unlock.
        </p>
        {txHash && (
          <a
            className="mt-4 block font-mono text-xs text-cyan-300 underline"
            href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}`}
            target="_blank"
          >
            View registration on ArcScan
          </a>
        )}
        <button className="pixel-button mx-auto mt-7" onClick={onEnter}>
          Enter Arc Detective Bureau
        </button>
      </PixelPanel>
    </div>
  );
}

function BureauHub({
  profile,
  onNavigate,
  solvedCount,
}: {
  profile?: DetectiveProfile;
  onNavigate(screen: Screen): void;
  solvedCount: number;
}) {
  const zones = [
    { screen: "caseDesk" as Screen, label: "Case Desk", icon: BriefcaseBusiness },
    { screen: "board" as Screen, label: "Evidence Board", icon: ClipboardCheck },
    { screen: "arcTerminal" as Screen, label: "Arc Terminal", icon: Terminal },
    { screen: "profileView" as Screen, label: "Profile Badge", icon: UserRound },
    { screen: "leaderboard" as Screen, label: "Leaderboard", icon: Trophy },
    { screen: "archive" as Screen, label: "Archive", icon: BookOpen },
  ];

  return (
    <div className="hub-shell">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="kicker">Arc Detective Bureau</p>
          <h1 className="pixel-title">Every payment leaves a clue.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-cyan-100/75">
            Mara Voss watches the case board. Byte circles the terminal. The Null
            Clerk is already inside the receipts.
          </p>
        </div>
        <div className="mini-badge">
          <Avatar uri={profile?.avatarURI} fallback={profile?.nickname ?? "A"} />
          <div>
            <p className="text-sm font-black">{profile?.nickname ?? "Detective"}</p>
            <p className="font-mono text-xs text-cyan-300">
              {rankTitle(profile?.reputation)} / {solvedCount} closed
            </p>
          </div>
        </div>
      </div>
      <div className="bureau-room">
        {zones.map(({ screen, label, icon: Icon }, index) => (
          <motion.button
            key={label}
            className={`hub-zone hub-zone-${index}`}
            whileHover={{ y: -5, boxShadow: "0 0 28px rgba(82,245,255,.42)" }}
            onClick={() => onNavigate(screen)}
          >
            <Icon size={22} />
            {label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function CaseDesk({
  cases,
  solved,
  onBack,
  onStart,
}: {
  cases: CaseFile[];
  solved: number[];
  onBack(): void;
  onStart(caseId: number): void;
}) {
  return (
    <div>
      <TopBar title="Case Desk" onBack={onBack} />
      <div className="case-grid">
        {cases.map((caseFile) => (
          <PixelPanel key={caseFile.id} className="case-file">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-cyan-300">
                  CASE {caseFile.id.toString().padStart(2, "0")}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {caseFile.title}
                </h2>
              </div>
              {solved.includes(caseFile.id) && <Medal className="text-cyan-300" />}
            </div>
            <p className="mt-4 text-sm leading-7 text-cyan-100/75">
              {caseFile.briefing}
            </p>
            <p className="mt-4 font-mono text-xs text-cyan-300">{caseFile.theme}</p>
            <button className="pixel-button mt-6 w-full" onClick={() => onStart(caseFile.id)}>
              {solved.includes(caseFile.id) ? "Review Case" : "Open File"}
            </button>
          </PixelPanel>
        ))}
      </div>
    </div>
  );
}

function CaseScene({
  caseFile,
  discoveredIds,
  solved,
  onDiscover,
  onBoard,
  onBack,
}: {
  caseFile: CaseFile;
  discoveredIds: string[];
  solved: boolean;
  onDiscover(id: string): void;
  onBoard(): void;
  onBack(): void;
}) {
  const allFound = caseFile.evidence.every((item) => discoveredIds.includes(item.id));

  return (
    <div>
      <TopBar title={caseFile.title} onBack={onBack} />
      <div className="case-scene">
        <div className="scene-stage">
          <div className="npc-card">
            <div className="npc-portrait" />
            <div>
              <p className="font-mono text-xs text-cyan-300">{caseFile.npc}</p>
              <p className="mt-2 text-sm text-cyan-50">
                &ldquo;{caseFile.npcLine}&rdquo;
              </p>
            </div>
          </div>
          {caseFile.evidence.map((item, index) => (
            <motion.button
              key={item.id}
              className={`hotspot hotspot-${index} ${
                discoveredIds.includes(item.id) ? "found" : ""
              }`}
              onClick={() => onDiscover(item.id)}
              whileTap={{ scale: 0.9 }}
            >
              <Sparkles size={16} />
              {discoveredIds.includes(item.id) ? item.title : "Inspect"}
            </motion.button>
          ))}
        </div>
        <PixelPanel>
          <p className="kicker">Byte says</p>
          <h2 className="mt-2 text-xl font-black">
            I found three receipts. Two are real. One is trying too hard.
          </h2>
          <p className="mt-4 text-sm leading-7 text-cyan-100/75">
            {caseFile.lesson} Collect every clue, then wire the truth on the
            evidence board.
          </p>
          <p className="mt-3 font-mono text-xs text-cyan-300">
            {allFound ? "CASE UPDATED: all clues recovered" : "Find every clue to complete the file"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {caseFile.evidence.map((item) => (
              <div
                className={`inventory-chip ${
                  discoveredIds.includes(item.id) ? "active" : ""
                }`}
                key={item.id}
              >
                {item.icon} {item.title}
              </div>
            ))}
          </div>
          <button className="pixel-button mt-6 w-full" disabled={!discoveredIds.length} onClick={onBoard}>
            Open Evidence Board
          </button>
          {solved && <p className="mt-4 text-xs text-cyan-300">Case already closed on Arc.</p>}
        </PixelPanel>
      </div>
    </div>
  );
}

function EvidenceBoard({
  caseFile,
  discoveredIds,
  placements,
  correctCount,
  onPlace,
  onBack,
  onTerminal,
}: {
  caseFile: CaseFile;
  discoveredIds: string[];
  placements: Record<string, string>;
  correctCount: number;
  onPlace(slot: EvidenceSlot, evidenceId: string): void;
  onBack(): void;
  onTerminal(): void;
}) {
  const discoveredEvidence = caseFile.evidence.filter((item) =>
    discoveredIds.includes(item.id),
  );

  return (
    <div>
      <TopBar title="Evidence Board" onBack={onBack} />
      <div className="board-layout">
        <PixelPanel>
          <p className="kicker">Evidence Inventory</p>
          <div className="mt-5 space-y-3">
            {discoveredEvidence.map((item) => (
              <div
                className="evidence-card"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
                key={item.id}
              >
                <span>{item.icon}</span>
                <div>
                  <p>{item.title}</p>
                  <small>{item.text}</small>
                </div>
              </div>
            ))}
          </div>
        </PixelPanel>
        <div className="evidence-board">
          {slots.map((slot) => {
            const evidence = caseFile.evidence.find((item) => item.id === placements[slot]);
            const correct = evidence?.slot === slot;
            return (
              <div
                className={`board-slot ${correct ? "correct" : ""}`}
                key={slot}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onPlace(slot, event.dataTransfer.getData("text/plain"))}
              >
                <p>{slot}</p>
                {evidence ? <span>{evidence.title}</span> : <small>Drop clue</small>}
              </div>
            );
          })}
          <div className="string-line line-a" />
          <div className="string-line line-b" />
          <div className="string-line line-c" />
        </div>
        <PixelPanel>
          <p className="kicker">Board Status</p>
          <h2 className="mt-2 text-2xl font-black">{correctCount}/5 wired</h2>
          <p className="mt-4 text-sm leading-7 text-cyan-100/75">
            Correct clues glow. When every slot is wired, Byte unlocks the
            deduction terminal.
          </p>
          <button className="pixel-button mt-6 w-full" disabled={correctCount < 5} onClick={onTerminal}>
            Unlock Deduction Terminal
          </button>
        </PixelPanel>
      </div>
    </div>
  );
}

function DeductionTerminal({
  caseFile,
  answers,
  setAnswers,
  onBack,
  onSolve,
  pending,
  error,
}: {
  caseFile: CaseFile;
  answers: string[];
  setAnswers(answers: string[]): void;
  onBack(): void;
  onSolve(): void;
  pending: boolean;
  error: string;
}) {
  const questions = [
    "What really happened?",
    "Which evidence proves it?",
    "Which wallet / agent / system caused the issue?",
    "What Arc concept makes the case resolvable?",
    "Should the case be marked solved?",
  ];

  return (
    <div>
      <TopBar title="Deduction Terminal" onBack={onBack} />
      <PixelPanel className="mx-auto max-w-4xl">
        <p className="kicker">Arc Proof Console</p>
        <h1 className="pixel-title mt-2">{caseFile.title}</h1>
        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <label className="block" key={question}>
              <span className="mb-2 block font-mono text-xs text-cyan-300">
                {index + 1}. {question}
              </span>
              <input
                className="terminal-input"
                value={answers[index]}
                onChange={(event) => {
                  const next = [...answers];
                  next[index] = event.target.value;
                  setAnswers(next);
                }}
                placeholder={index === 4 ? "yes" : "Type deduction..."}
              />
            </label>
          ))}
        </div>
        {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
        <button className="pixel-button mt-6 w-full" disabled={pending} onClick={onSolve}>
          <ShieldCheck size={18} />
          {pending ? "Submitting Case Proof..." : "Submit Case Proof on Arc"}
        </button>
      </PixelPanel>
    </div>
  );
}

function CaseClosed({
  caseFile,
  txHash,
  onHub,
}: {
  caseFile: CaseFile;
  txHash: string;
  onHub(): void;
}) {
  return (
    <div className="mx-auto grid min-h-[78vh] max-w-4xl place-items-center text-center">
      <PixelPanel>
        <motion.div
          className="case-stamp mx-auto"
          initial={{ scale: 2, opacity: 0, rotate: -12 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
        >
          CASE CLOSED ON ARC
        </motion.div>
        <h1 className="pixel-title mt-7">{caseFile.title}</h1>
        <p className="mt-4 text-cyan-100/75">
          Badge unlocked: {badgeNames[caseFile.badge]}. Score {caseFile.score}.
        </p>
        <div className="share-card mt-6">
          <p>ARCTECTIVE CASE FILE</p>
          <strong>{caseFile.title}</strong>
          <span>{caseFile.lesson}</span>
        </div>
        {txHash && (
          <a
            className="mt-5 block font-mono text-xs text-cyan-300 underline"
            href={`${ARC_TESTNET.blockExplorers.default.url}/tx/${txHash}`}
            target="_blank"
          >
            {shortAddress(txHash)}
          </a>
        )}
        <button className="pixel-button mx-auto mt-7" onClick={onHub}>
          Return to Bureau
        </button>
      </PixelPanel>
    </div>
  );
}

function ProfileScreen({
  profile,
  address,
  solved,
  badges,
  onBack,
}: {
  profile?: DetectiveProfile;
  address?: string;
  solved: number[];
  badges: number[];
  onBack(): void;
}) {
  return (
    <div>
      <TopBar title="Profile Badge" onBack={onBack} />
      <PixelPanel className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar uri={profile?.avatarURI} fallback={profile?.nickname ?? address ?? "A"} large />
          <div>
            <p className="kicker">{rankTitle(profile?.reputation)}</p>
            <h1 className="pixel-title">{profile?.nickname ?? "Detective"}</h1>
            <p className="mt-2 text-cyan-100/75">@{profile?.xUsername ?? "unknown"}</p>
            <p className="mt-1 font-mono text-xs text-cyan-300">{shortAddress(address)}</p>
          </div>
        </div>
        <p className="mt-6 text-lg text-cyan-50">
          &ldquo;{profile?.motto ?? "Receipts remember."}&rdquo;
        </p>
        <div className="stat-grid mt-6">
          <Stat label="Reputation" value={Number(profile?.reputation ?? 0).toString()} />
          <Stat label="Cases Solved" value={solved.length.toString()} />
          <Stat label="Badges" value={badges.length.toString()} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {badges.map((badge) => (
            <span className="badge-pill" key={badge}>
              {badgeNames[badge] ?? `Badge ${badge}`}
            </span>
          ))}
        </div>
      </PixelPanel>
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
      <TopBar title="Detective Ranking Board" onBack={onBack} />
      <PixelPanel className="mx-auto max-w-5xl">
        <div className="space-y-3">
          {leaderboard.length ? (
            leaderboard.map((detective, index) => (
              <div className="leader-row" key={`${detective.wallet}-${index}`}>
                <span>#{index + 1}</span>
                <Avatar uri={detective.avatarURI} fallback={detective.nickname} />
                <strong>{detective.nickname}</strong>
                <small>@{detective.xUsername}</small>
                <em>{Number(detective.reputation)} REP</em>
              </div>
            ))
          ) : (
            <p className="text-cyan-100/75">No leaderboard entries returned yet.</p>
          )}
        </div>
      </PixelPanel>
    </div>
  );
}

function ArchiveScreen({ solved, onBack }: { solved: number[]; onBack(): void }) {
  return (
    <div>
      <TopBar title="Archive" onBack={onBack} />
      <div className="case-grid">
        {CASES.map((caseFile) => (
          <PixelPanel key={caseFile.id}>
            <p className="kicker">Case {caseFile.id}</p>
            <h2 className="mt-2 text-2xl font-black">{caseFile.title}</h2>
            <p className="mt-4 text-sm text-cyan-100/75">{caseFile.lesson}</p>
            <div className="mt-5 badge-pill">
              {solved.includes(caseFile.id) ? "Closed on Arc" : "Unsolved"}
            </div>
          </PixelPanel>
        ))}
      </div>
    </div>
  );
}

function ArcTerminalScreen({ onBack }: { onBack(): void }) {
  return (
    <div>
      <TopBar title="Arc Terminal" onBack={onBack} />
      <PixelPanel className="mx-auto max-w-4xl">
        <div className="terminal-lines">
          <p>&gt; network: Arc Testnet</p>
          <p>&gt; chain_id: 5042002</p>
          <p>&gt; native_gas: USDC</p>
          <p>&gt; finality: sub-second deterministic</p>
          <p>&gt; evm: compatible</p>
          <p>&gt; casebook: {ARCTECTIVE_CONTRACT_ADDRESS}</p>
          <p>&gt; directive: solve financial mysteries, commit reputation.</p>
        </div>
      </PixelPanel>
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack(): void }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <button className="back-button" onClick={onBack}>
        Back
      </button>
      <h1 className="font-mono text-sm uppercase text-cyan-300">{title}</h1>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange(value: string): void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase text-cyan-300">
        {label}
      </span>
      <input
        className="terminal-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Avatar({
  uri,
  fallback,
  large = false,
}: {
  uri?: string;
  fallback: string;
  large?: boolean;
}) {
  return (
    <div className={large ? "avatar avatar-large" : "avatar"}>
      {uri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={uri} alt="" onError={(event) => (event.currentTarget.style.display = "none")} />
      ) : null}
      <span>{fallback.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
