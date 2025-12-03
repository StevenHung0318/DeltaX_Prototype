import React, { useState, useRef } from "react";
import { useProtocol } from "../context/ProtocolContext";
import { formatAddress } from "../utils/format";
import { Wallet, ChevronDown } from "lucide-react";
import SynexLogo from "../assets/WaterX_logo.svg";

type Page = "dashboard" | "markets" | "swap" | "liquidity" | "clob" | "perp";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPage,
  onNavigate,
}) => {
  const { connectedAddress, connectWallet, disconnectWallet } = useProtocol();
  const [lendOpen, setLendOpen] = useState(false);
  const [dexOpen, setDexOpen] = useState(false);
  const lendCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dexCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    if (page !== "markets" && page !== "dashboard") {
      setLendOpen(false);
    }
    if (page !== "swap" && page !== "liquidity") {
      setDexOpen(false);
    }
  };

  const navButtonBase =
    "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border";
  const activeNavStyles =
    "bg-gradient-to-r from-[#1a2f6b] via-[#142653] to-[#0d1d3d] text-white border-[#2e4aa5] shadow-[0px_10px_30px_rgba(0,82,255,0.35)]";
  const inactiveNavStyles =
    "text-gray-300 border-transparent bg-[#0f1625]/80 hover:bg-[#151f34]/90 hover:text-white hover:border-[#24345b]/70";

  const handleHoverOpen = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setter(true);
  };

  const handleHoverClose = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setter(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <nav className="border-b border-gray-800 bg-[#161921]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between sm:justify-start sm:space-x-8">
              <img src={SynexLogo} alt="WaterX logo" className="h-6 w-auto" />
              <div className="flex items-center space-x-6">
                <div
                  className="relative"
                  onMouseEnter={() =>
                    handleHoverOpen(setLendOpen, lendCloseTimeout)
                  }
                  onMouseLeave={() =>
                    handleHoverClose(setLendOpen, lendCloseTimeout)
                  }
                  onTouchStart={() => setLendOpen((prev) => !prev)}
                >
                  <button
                    className={`${navButtonBase} ${
                      currentPage === "markets" || currentPage === "dashboard"
                        ? activeNavStyles
                        : inactiveNavStyles
                    }`}
                  >
                    <span>Lend</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        lendOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {lendOpen && (
                    <div className="absolute left-0 mt-3 w-48 rounded-2xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 shadow-[0px_18px_45px_rgba(2,6,23,0.65)] backdrop-blur-xl z-20 p-2 space-y-1">
                      <button
                        onClick={() => handleNavigate("markets")}
                        className={`block w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all duration-150 ${
                          currentPage === "markets"
                            ? "text-white bg-white/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Markets
                      </button>
                      <button
                        onClick={() => handleNavigate("dashboard")}
                        className={`block w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all duration-150 ${
                          currentPage === "dashboard"
                            ? "text-white bg-white/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Position
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className="relative"
                  onMouseEnter={() =>
                    handleHoverOpen(setDexOpen, dexCloseTimeout)
                  }
                  onMouseLeave={() =>
                    handleHoverClose(setDexOpen, dexCloseTimeout)
                  }
                  onTouchStart={() => setDexOpen((prev) => !prev)}
                >
                  <button
                    className={`${navButtonBase} ${
                      currentPage === "swap" ||
                      currentPage === "liquidity" ||
                      currentPage === "clob"
                        ? activeNavStyles
                        : inactiveNavStyles
                    }`}
                  >
                    <span>Spot</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        dexOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {dexOpen && (
                    <div className="absolute left-0 mt-3 w-48 rounded-2xl border border-[#1f2c4e]/80 bg-[#0d1323]/95 shadow-[0px_18px_45px_rgba(2,6,23,0.65)] backdrop-blur-xl z-20 p-2 space-y-1">
                      <button
                        onClick={() => handleNavigate("swap")}
                        className={`block w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all duration-150 ${
                          currentPage === "swap"
                            ? "text-white bg-white/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Swap
                      </button>
                      <button
                        onClick={() => handleNavigate("liquidity")}
                        className={`block w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all duration-150 ${
                          currentPage === "liquidity"
                            ? "text-white bg-white/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Liquidity Pools
                      </button>
                      <button
                        onClick={() => handleNavigate("clob")}
                        className={`block w-full px-4 py-2.5 text-left text-sm rounded-xl transition-all duration-150 ${
                          currentPage === "clob"
                            ? "text-white bg-white/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Order Book (CLOB)
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleNavigate("perp")}
                  className={`${navButtonBase} ${
                    currentPage === "perp" ? activeNavStyles : inactiveNavStyles
                  }`}
                >
                  <span>Perp</span>
                </button>
                <button
                  onClick={connectedAddress ? disconnectWallet : connectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors sm:hidden"
                >
                  <Wallet size={16} />
                  <span>
                    {connectedAddress
                      ? formatAddress(connectedAddress)
                      : "Connect Wallet"}
                  </span>
                </button>
              </div>
            </div>
            <div className="hidden sm:flex">
              {connectedAddress ? (
                <button
                  onClick={disconnectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors font-mono text-sm"
                >
                  <Wallet size={16} />
                  <span>{formatAddress(connectedAddress)}</span>
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#0052FF] hover:bg-[#0046DD] text-white rounded-lg transition-colors"
                >
                  <Wallet size={16} />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
};
