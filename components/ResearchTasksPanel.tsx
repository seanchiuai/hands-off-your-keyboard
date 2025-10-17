"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle2, XCircle, Clock, ArrowRight, Package, DollarSign, Sparkles, RefreshCw } from "lucide-react";
import { useState } from "react";

export function ResearchTasksPanel() {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(true);
  const [showFailed, setShowFailed] = useState(true);
  
  // Get user's recent queries
  const recentQueries = useQuery(api.queries.getUserQueries, { limit: 20 });
  
  // Separate queries by status
  const activeQueries = recentQueries?.filter(
    (q) => q.status === "pending" || q.status === "searching"
  ) || [];
  
  const recentCompleted = recentQueries?.filter(
    (q) => q.status === "completed"
  ).slice(0, 5) || [];
  
  const recentFailed = recentQueries?.filter(
    (q) => q.status === "failed"
  ).slice(0, 3) || [];

  const handleViewResults = (queryId: string) => {
    router.push(`/research?queryId=${queryId}`);
  };

  // Calculate time since action
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Estimate completion time for searching queries
  const getEstimatedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const estimated = Math.max(5, 30 - elapsed); // Estimate 30 seconds total
    return `~${estimated}s remaining`;
  };

  if (!recentQueries) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-20 rounded-lg"></div>
        <div className="skeleton h-20 rounded-lg"></div>
      </div>
    );
  }

  if (recentQueries.length === 0) {
    return (
      <div className="text-center py-12 card-elevated rounded-2xl border-2 border-dashed border-border/50">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Start Your First Research</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Search for products across multiple retailers and get real-time results. Your searches will appear here.
        </p>
        <button
          onClick={() => router.push("/research")}
          className="px-6 py-3 gradient-primary text-white text-sm font-bold rounded-lg glow-hover transition-smooth spring-button inline-flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Start Research
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Searches */}
      {activeQueries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Active Searches ({activeQueries.length})
            </h3>
            <button
              onClick={() => router.push("/research")}
              className="text-xs text-muted-foreground hover:text-primary transition-smooth"
            >
              View All
            </button>
          </div>
          {activeQueries.map((query) => (
            <div
              key={query._id}
              className="group card-elevated rounded-xl p-5 border-l-4 border-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent hover:from-blue-500/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="relative">
                    {query.status === "pending" ? (
                      <Clock className="w-6 h-6 text-blue-500" />
                    ) : (
                      <>
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-foreground mb-1 line-clamp-2">
                        {query.searchText}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                        <Clock className="w-3 h-3" />
                        {query.status === "pending" ? "Initializing..." : getEstimatedTime(query.createdAt)}
                      </div>
                    </div>
                    <Badge className="flex-shrink-0 bg-blue-500 text-white border-0 shadow-glow">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {query.status === "pending" ? "Starting" : "Searching"}
                    </Badge>
                  </div>
                  
                  {query.preferences && (query.preferences.minPrice || query.preferences.maxPrice) && (
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <div className="flex gap-2 text-xs">
                        {query.preferences.minPrice && (
                          <span className="px-2 py-1 bg-card/80 border border-border/50 rounded-md font-medium">
                            Min: ${query.preferences.minPrice}
                          </span>
                        )}
                        {query.preferences.maxPrice && (
                          <span className="px-2 py-1 bg-card/80 border border-border/50 rounded-md font-medium">
                            Max: ${query.preferences.maxPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-progress-indeterminate shadow-glow"></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started {getTimeAgo(query.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recently Completed */}
      {recentCompleted.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full px-1 group"
          >
            <h3 className="text-sm font-bold text-green-600 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({recentCompleted.length})
            </h3>
            <ArrowRight className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
          </button>
          
          {showCompleted && recentCompleted.map((query) => (
            <div
              key={query._id}
              className="group card-simple rounded-xl p-4 hover:bg-card/80 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-green-500/20"
              onClick={() => handleViewResults(query._id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {query.searchText}
                    </h4>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 font-medium">
                      ✓ {getTimeAgo(query.updatedAt)}
                    </span>
                    {query.preferences && (query.preferences.minPrice || query.preferences.maxPrice) && (
                      <span className="text-muted-foreground">
                        • ${query.preferences.minPrice || 0} - ${query.preferences.maxPrice || '∞'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed Searches */}
      {recentFailed.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowFailed(!showFailed)}
            className="flex items-center justify-between w-full px-1 group"
          >
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Failed ({recentFailed.length})
            </h3>
            <ArrowRight className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-transform ${showFailed ? 'rotate-90' : ''}`} />
          </button>
          
          {showFailed && recentFailed.map((query) => (
            <div
              key={query._id}
              className="card-simple rounded-xl p-4 border-l-4 border-red-500 bg-gradient-to-br from-red-500/5 to-transparent"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                      {query.searchText}
                    </h4>
                    <Badge variant="destructive" className="flex-shrink-0 bg-red-500/20 text-red-600 border-red-500/30">
                      Failed
                    </Badge>
                  </div>
                  <p className="text-xs text-red-600 mb-2">
                    Failed {getTimeAgo(query.updatedAt)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/research");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-smooth"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry Search
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats & Actions */}
      {recentQueries.length > 0 && (
        <div className="card-elevated rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{activeQueries.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{recentCompleted.length}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{recentQueries.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
            <button
              onClick={() => router.push("/research")}
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-smooth flex items-center gap-2 shadow-glow"
            >
              <Search className="w-4 h-4" />
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

