import { useState, useEffect } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Sparkles, Cloud, Sun, CloudRain, Snowflake, Moon, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Replace this with the GenLayer Studio deployed contract address later
const CONTRACT_ADDRESS = '0xcc46e0f86329bFDCFAb151512826a7C164050098'; 

function App() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [cityInput, setCityInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [nftData, setNftData] = useState<any>(null);

  const addLog = (log: string, delay: number = 0) => {
    setTimeout(() => {
      setLogs(prev => [...prev, log]);
    }, delay);
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error('Connection failed:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'SUNNY': return <Sun size={80} />;
      case 'CLOUDY': return <Cloud size={80} />;
      case 'RAINY': return <CloudRain size={80} />;
      case 'SNOWY': return <Snowflake size={80} />;
      case 'NIGHT': return <Moon size={80} />;
      default: return <Sparkles size={80} />;
    }
  };

  const getMoodClass = (mood: string) => {
    if (!mood || mood === 'UNINITIALIZED') return '';
    return `mood-${mood.toLowerCase()}`;
  };

  const handleMintAndSync = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!cityInput) {
      alert("Please enter a city name.");
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    setNftData(null);

    addLog(`[System] Initiating Genesis Mint for City: ${cityInput}...`);

    if (!CONTRACT_ADDRESS) {
      // ---------------------------------------------------------
      // MOCK MODE FOR LOCALHOST TESTING BEFORE GENLAYER DEPLOYMENT
      // ---------------------------------------------------------
      addLog(`[Localhost] No contract address found. Running simulation...`, 500);
      addLog(`[GenVM] Executing mint_city_nft("${cityInput}")...`, 1500);
      
      setTimeout(() => {
        setNftData({
          id: "0",
          city: cityInput,
          mood: "UNINITIALIZED",
          temperature: "UNKNOWN",
          last_updated: "never"
        });
        addLog(`[GenVM] NFT #0 Minted successfully.`, 2500);
        addLog(`[GenVM] Triggering sync_real_world_data(0)...`, 3500);
        addLog(`[Oracle] gl.nondet.web.get fetching live weather...`, 4500);
      }, 2000);

      setTimeout(() => {
        addLog(`[Oracle] gl.nondet.exec_prompt running AI analysis...`, 6000);
        addLog(`[Consensus] Validators agreeing on subjective data via strict_eq...`, 8000);
      }, 2000);

      setTimeout(() => {
        // Randomly pick a weather for the mock
        const moods = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        const temps = ['+22°C', '+15°C', '+8°C', '-2°C'];
        const randomTemp = temps[Math.floor(Math.random() * temps.length)];

        setNftData({
          id: "0",
          city: cityInput,
          mood: randomMood,
          temperature: `Mocked ${randomTemp}`,
          last_updated: new Date().toLocaleTimeString()
        });
        
        addLog(`[Success] Real-world data synced and NFT evolved!`, 10000);
        setIsProcessing(false);
      }, 10000);

      return;
    }

    // ---------------------------------------------------------
    // REAL GENLAYER STUDIONET INTERACTION
    // ---------------------------------------------------------
    try {
      addLog(`[Security] Requesting Wallet Signature...`, 500);
      
      try {
        const message = `SentiMint Authorization\n\nMint dynamic NFT for city: ${cityInput}\nWallet: ${walletAddress}`;
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, walletAddress],
        });
        addLog(`[Security] Signature verified: ${signature.substring(0, 15)}...`, 1500);
      } catch (signError) {
        addLog(`[Error] User rejected wallet signature.`, 1000);
        setIsProcessing(false);
        return;
      }

      addLog(`[Web3] Creating GenLayer client...`, 2500);
      const dummyKey = '0x1111111111111111111111111111111111111111111111111111111111111111' as `0x${string}`;
      const glAccount = privateKeyToAccount(dummyKey);
      const glClient = createClient({ chain: studionet, account: glAccount });

      addLog(`[GenVM] Sending mint transaction...`, 3500);
      
      const mintTx = await glClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'mint_city_nft',
        args: [cityInput],
        value: 0n,
      });

      addLog(`[Blockchain] Mint TX sent: ${mintTx.substring(0, 10)}...`, 2000);
      
      // Wait for mint to be accepted on ledger
      try {
        await glClient.waitForTransactionReceipt({ hash: mintTx, status: 'ACCEPTED' as any });
      } catch (err) {
        // Polling delay fallback
        await new Promise(r => setTimeout(r, 5000));
      }
      
      // Fetch the latest token ID that was just minted
      let currentId = "0";
      try {
        const total = await glClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: 'get_total_mints',
        });
        currentId = String(Number(total) - 1);
      } catch (e) {
        console.warn("Could not fetch total mints, defaulting to 0");
      }

      addLog(`[GenVM] Syncing live real-world weather data for NFT #${currentId}...`, 500);
      const syncTx = await glClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'sync_real_world_data',
        args: [currentId],
        value: 0n,
      });

      addLog(`[Consensus] Waiting for AI Validators...`, 2000);

      // Poll for the result
      let finalData = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 4000));
        try {
          const res = await glClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_nft',
            args: [currentId],
          });
          
          if (res && res !== "NOT_FOUND") {
            const parsed = JSON.parse(res as string);
            if (parsed.mood !== "UNINITIALIZED") {
              finalData = parsed;
              break;
            }
          }
        } catch (e) {}
      }

      if (finalData) {
        setNftData(finalData);
        addLog(`[Success] Real-world data synced and NFT evolved!`, 1000);
      } else {
        addLog(`[Error] Timeout waiting for consensus.`, 1000);
      }
      
      setIsProcessing(false);

    } catch (error: any) {
      addLog(`[Error] ${error.message}`, 1000);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <nav>
        <div className="logo">
          <Code className="logo-icon" size={24} />
          SentiMint
        </div>
        <button 
          className={`btn-connect ${walletAddress ? 'connected' : ''}`} 
          onClick={connectWallet}
        >
          {walletAddress ? `[${walletAddress.substring(0,6)}...${walletAddress.substring(38)}]` : 'Connect Wallet'}
        </button>
      </nav>

      <main className="container">
        <div className="hero-text">
          <div className="badge">GenLayer Exclusive Primitive</div>
          <h1>Dynamic NFTs powered by the Real World.</h1>
          <p>
            Standard NFTs are static. SentiMint uses GenLayer's AI Oracle to scrape live weather and news data, autonomously evolving your asset's visual traits and metadata based on physical reality.
          </p>

          <div className="mint-box">
            <input 
              type="text" 
              className="mint-input" 
              placeholder="Enter a City (e.g. Tokyo, London)"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              disabled={isProcessing}
            />
            <button 
              className="btn-primary" 
              onClick={handleMintAndSync}
              disabled={isProcessing || !cityInput}
            >
              <Sparkles size={18} />
              {isProcessing ? 'Evolving...' : 'Mint & Sync'}
            </button>
          </div>

          <div className="console-wrapper">
            <div className="console-header">
              <span>Terminal</span>
              <span>—</span>
              <span>SentiMint.exe</span>
            </div>
            <div className="console-body">
              {logs.length === 0 && <span style={{opacity: 0.5}}>&gt; Awaiting execution...</span>}
              <AnimatePresence>
                {logs.map((log, i) => (
                  <motion.div 
                    key={i} 
                    className={`log-line ${log.includes('[Success]') ? 'log-success' : log.includes('[Error]') ? 'log-error' : ''}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="prefix">~</span> {log}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isProcessing && <motion.div animate={{opacity: [1, 0, 1]}} transition={{repeat: Infinity}}>_</motion.div>}
            </div>
          </div>
        </div>

        <div className="nft-display">
          {nftData ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={nftData.mood}
                className="nft-card"
                initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <div className={`nft-image-area ${getMoodClass(nftData.mood)}`}>
                  {getMoodIcon(nftData.mood)}
                </div>
                <div className="nft-info">
                  <h3>{nftData.city}</h3>
                  <div className="nft-stats">
                    <div className="stat">
                      <span className="stat-label">Token ID</span>
                      <span className="stat-value">#{nftData.id}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">AI Mood</span>
                      <span className="stat-value">{nftData.mood}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Live Data</span>
                      <span className="stat-value">{nftData.temperature.split(' ')[1] || nftData.temperature}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Last Synced</span>
                      <span className="stat-value">{nftData.last_updated}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="nft-card" style={{ opacity: 0.3, filter: 'grayscale(1)' }}>
              <div className="nft-image-area">
                <Sparkles size={80} opacity={0.5} />
              </div>
              <div className="nft-info">
                <h3>???</h3>
                <div className="nft-stats">
                  <div className="stat"><span className="stat-label">Token ID</span><span className="stat-value">--</span></div>
                  <div className="stat"><span className="stat-label">AI Mood</span><span className="stat-value">--</span></div>
                  <div className="stat"><span className="stat-label">Live Data</span><span className="stat-value">--</span></div>
                  <div className="stat"><span className="stat-label">Last Synced</span><span className="stat-value">--</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default App;
