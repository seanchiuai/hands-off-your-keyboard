"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SearchInput } from "@/components/SearchInput";
import { ProductCarousel } from "@/components/ProductCarousel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ResearchPage() {
  const [activeQueryId, setActiveQueryId] = useState<Id<"queries"> | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("search");

  // Get user's recent queries
  const recentQueries = useQuery(api.queries.getUserQueries, { limit: 10 });

  const handleSearchCreated = (queryId: Id<"queries">) => {
    setActiveQueryId(queryId);
    setSelectedTab("results");
  };

  const handleQuerySelect = (queryId: Id<"queries">) => {
    setActiveQueryId(queryId);
    setSelectedTab("results");
  };

  const handleSaveProduct = (productId: string) => {
    toast.success("Product saved to your list!");
    // TODO: Implement actual save functionality
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Background Research</h1>
        <p className="text-muted-foreground">
          Search for products and we will continuously find the best options from multiple retailers
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="search">New Search</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <SearchInput onSearchCreated={handleSearchCreated} />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          {activeQueryId ? (
            <ProductCarousel queryId={activeQueryId} onSaveProduct={handleSaveProduct} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No active search</p>
                <p className="text-sm text-muted-foreground">
                  Create a new search or select one from your history
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Search History</CardTitle>
              <CardDescription>Your recent product searches</CardDescription>
            </CardHeader>
            <CardContent>
              {recentQueries === undefined ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentQueries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No search history yet</p>
              ) : (
                <div className="space-y-2">
                  {recentQueries.map((query) => (
                    <button
                      key={query._id}
                      onClick={() => handleQuerySelect(query._id)}
                      className="w-full text-left p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{query.searchText}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(query.createdAt).toLocaleDateString()} at{" "}
                            {new Date(query.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            query.status === "completed"
                              ? "default"
                              : query.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {query.status}
                        </Badge>
                      </div>
                      {query.preferences && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {query.preferences.minPrice !== undefined && (
                            <Badge variant="outline">Min: ${query.preferences.minPrice}</Badge>
                          )}
                          {query.preferences.maxPrice !== undefined && (
                            <Badge variant="outline">Max: ${query.preferences.maxPrice}</Badge>
                          )}
                          {query.preferences.minRating !== undefined && (
                            <Badge variant="outline">Rating: {query.preferences.minRating}+</Badge>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
