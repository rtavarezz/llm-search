import React, { useState, useEffect } from 'react';
import './App.css';

interface SourceItem {
  title: string;
  url: string;
  snippet: string;
}

interface Insight {
  id: number;
  prompt: string;
  insights: string;
  search_results?: SourceItem[];
  created_at: string;
}

function App() {
  const [prompts, setPrompts] = useState('');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAllResults, setShowAllResults] = useState(false);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const response = await fetch(`${API_BASE}/insights`);
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompts.trim()) return;

    const promptList = prompts.split('\n').filter(p => p.trim());
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts: promptList }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      // Wait for analysis to complete then reload
      setTimeout(() => {
        loadInsights();
        setLoading(false);
      }, 3000);

    } catch (err) {
      setError('Failed to analyze prompts. Please try again.');
      setLoading(false);
    }
  };

  const setExamplePrompt = (prompt: string) => {
    setPrompts(prompt);
  };

  const formatInsight = (text: string) => {
    if (text.startsWith('Analysis failed:')) {
      return (
        <div className="error">
          <strong>Analysis Temporarily Unavailable</strong>
          <p>Our AI analysis service is experiencing high demand. Please try again in a moment.</p>
        </div>
      );
    }

    // Build sections using bold headings on their own lines,
    // without splitting on inline **bold** within list items.
    const cleanSections: { title: string; content: string[] }[] = [];
    const lines = text.split('\n');

    let currentTitle = '';
    let currentContent: string[] = [];

    const flushSection = () => {
      const content = currentContent
        .map(line => line.replace(/^\* /, '').trim())
        .filter(line => line.length > 0);
      if (currentTitle || content.length > 0) {
        cleanSections.push({ title: currentTitle || 'Insight', content });
      }
      currentTitle = '';
      currentContent = [];
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      // Treat lines like "**Top 3 Options:**" as section headers
      const header = line.match(/^\*\*([^*]+)\*\*\s*:?\s*$/);
      // Also treat simple Title: lines (no list prefix) as section headers
      const simpleHeader = !header && line.match(/^[A-Z][A-Za-z0-9 ()/#&+-]*:\s*$/);

      if (header || simpleHeader) {
        flushSection();
        currentTitle = (header ? header[1] : line.replace(/:$/,'')).trim();
        continue;
      }

      currentContent.push(line);
    }

    // Flush any remaining content as a section
    flushSection();

    return (
      <div className="insight-professional">
        {cleanSections.map((section, index) => (
          <div key={index} className="section">
            <h3 className="section-title">{section.title}</h3>
            <div className="section-content">
              {section.content.map((item, itemIndex) => {
                // Handle numbered lists - format as "1. CompanyName: Description"
                if (item.match(/^\d+\./)) {
                  // Clean up the item first - remove ** formatting
                  const cleanItem = item.replace(/\*\*/g, '');
                  const match = cleanItem.match(/^(\d+)\.\s*(.+?):\s*(.+)$/);
                  
                  if (match) {
                    const [, number, name, description] = match;
                    return (
                      <div key={itemIndex} className="numbered-item-compact">
                        {number}. <span className="item-name">{name.trim()}</span>: {description.trim()}
                      </div>
                    );
                  }
                  
                  // Fallback - just display the item as-is
                  return (
                    <div key={itemIndex} className="numbered-item-compact">
                      {cleanItem}
                    </div>
                  );
                }
                // Handle bullet points and special metrics (e.g., Confidence)
                else if (item.includes(':')) {
                  const idx = item.indexOf(':');
                  const rawLabel = idx === -1 ? item : item.slice(0, idx);
                  const desc = idx === -1 ? '' : item.slice(idx + 1);
                  const label = rawLabel.replace(/^\* /, '').replace(/\*\*/g, '').trim();

                  // Confidence visual if pattern like 8/10 or 80%
                  const lower = label.toLowerCase();
                  const val = desc.trim();
                  let confidencePct: number | null = null;
                  if (lower === 'confidence') {
                    const ten = val.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
                    const pct = val.match(/(\d+(?:\.\d+)?)\s*%/);
                    if (ten) confidencePct = Math.max(0, Math.min(100, parseFloat(ten[1]) * 10));
                    else if (pct) confidencePct = Math.max(0, Math.min(100, parseFloat(pct[1])));
                  }

                  if (confidencePct !== null) {
                    return (
                      <div key={itemIndex} className="metric-row">
                        <strong className="bullet-label">Confidence:</strong>
                        <div className="confidence-bar" aria-label={`Confidence ${confidencePct}%`}>
                          <div className="confidence-fill" style={{ width: `${confidencePct}%` }} />
                        </div>
                        <span className="metric-value">{val}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={itemIndex} className="bullet-item">
                      <strong className="bullet-label">{label}:</strong>
                      <span className="bullet-desc">{val}</span>
                    </div>
                  );
                }
                // Regular text
                else {
                  return (
                    <p key={itemIndex} className="regular-text">
                      {item}
                    </p>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Spice</h1>
          <p>AI Signal Detection for Consumer Brands</p>
        </header>

        <div className="search-section">
          <form onSubmit={handleAnalyze}>
            <div className="form-group">
              <label htmlFor="prompts">
                Enter your brand intelligence queries (one per line):
              </label>
              <textarea
                id="prompts"
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                placeholder="Example:&#10;best CRM software 2024&#10;top email marketing tools&#10;authentication providers comparison"
                rows={4}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Market Signals'}
            </button>

            <div className="example-prompts">
              <strong>Try these examples:</strong>
              <span 
                className="example-prompt" 
                onClick={() => setExamplePrompt('best project management tools 2024')}
              >
                Project Management Tools
              </span>
              <span 
                className="example-prompt" 
                onClick={() => setExamplePrompt('top CRM software comparison')}
              >
                CRM Software
              </span>
              <span 
                className="example-prompt" 
                onClick={() => setExamplePrompt('authentication providers review')}
              >
                Auth Providers
              </span>
              <span 
                className="example-prompt" 
                onClick={() => setExamplePrompt('email marketing platforms 2024')}
              >
                Email Marketing
              </span>
            </div>
          </form>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Analyzing market signals...</p>
            </div>
          )}

          {error && <div className="error">{error}</div>}
        </div>

        <div className="insights-section">
          {insights.length === 0 ? (
            <div className="empty-state">
              <h2>No insights yet</h2>
              <p>Try analyzing some prompts to see brand intelligence insights!</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>Brand Intelligence Results</h2>
                <div className="results-controls">
                  <button 
                    className="toggle-btn"
                    onClick={() => setShowAllResults(!showAllResults)}
                  >
                    {showAllResults ? 'Show Latest Only' : `Show All Results (${insights.length})`}
                  </button>
                </div>
              </div>
              <div className="insights-grid">
                {(showAllResults ? insights : insights.slice(0, 1)).map((insight) => (
                  <div key={insight.id} className="insight-card">
                    <div className="insight-header">
                      <h2 className="prompt-text">{insight.prompt}</h2>
                      <span className="timestamp">
                        Generated: {new Date(insight.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="insight-content">
                      {formatInsight(insight.insights)}
                      {insight.search_results && insight.search_results.length > 0 && (
                        <details className="sources">
                          <summary>View Sources ({Math.min(insight.search_results.length, 5)})</summary>
                          <ul className="sources-list">
                            {(insight.search_results || []).slice(0, 5).map((s, i) => {
                              const url = s.url || '#';
                              const domain = (() => {
                                try {
                                  const u = new URL(url);
                                  return u.hostname.replace(/^www\./, '');
                                } catch {
                                  return '';
                                }
                              })();
                              return (
                                <li key={i} className="source-item">
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="source-link">
                                    {s.title || domain || 'Source'}
                                  </a>
                                  {domain && <span className="source-domain">{domain}</span>}
                                  {s.snippet && <div className="source-snippet">{s.snippet}</div>}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
