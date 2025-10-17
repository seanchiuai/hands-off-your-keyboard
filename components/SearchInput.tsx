"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SearchPreferences {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  targetRetailers?: string[];
}

interface SearchInputProps {
  onSearchCreated?: (queryId: string) => void;
  showPreferences?: boolean;
}

export function SearchInput({ onSearchCreated, showPreferences = true }: SearchInputProps) {
  const [searchText, setSearchText] = useState("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createSearchQuery = useMutation(api.queries.createSearchQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchText.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build preferences object
      const preferences: SearchPreferences = {};

      if (minPrice) {
        const parsedMinPrice = parseFloat(minPrice);
        if (!isNaN(parsedMinPrice) && parsedMinPrice >= 0) {
          preferences.minPrice = parsedMinPrice;
        }
      }

      if (maxPrice) {
        const parsedMaxPrice = parseFloat(maxPrice);
        if (!isNaN(parsedMaxPrice) && parsedMaxPrice >= 0) {
          preferences.maxPrice = parsedMaxPrice;
        }
      }

      if (minRating) {
        const parsedMinRating = parseFloat(minRating);
        if (!isNaN(parsedMinRating) && parsedMinRating >= 0 && parsedMinRating <= 5) {
          preferences.minRating = parsedMinRating;
        }
      }

      // Validate price range
      if (preferences.minPrice && preferences.maxPrice && preferences.minPrice > preferences.maxPrice) {
        toast.error("Minimum price cannot be greater than maximum price");
        setIsSubmitting(false);
        return;
      }

      // Create the search query
      const queryId = await createSearchQuery({
        searchText: searchText.trim(),
        preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
      });

      toast.success("Search initiated! Finding the best products for you...");

      // Clear form
      setSearchText("");
      setMinPrice("");
      setMaxPrice("");
      setMinRating("");

      // Notify parent component
      if (onSearchCreated) {
        onSearchCreated(queryId);
      }
    } catch (error) {
      console.error("Error creating search:", error);
      toast.error("Failed to create search", {
        description: "There was an error starting your search. Check your connection and try again. If the problem persists, try simpler search terms.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search for Products</CardTitle>
        <CardDescription>
          Enter what you are looking for and we will find the best options from multiple retailers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">What are you looking for?</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                type="text"
                placeholder="e.g., wireless headphones, office chair, running shoes"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting || !searchText.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {showPreferences && (
            <div className="pt-4 border-t space-y-4">
              <h4 className="text-sm font-medium">Preferences (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPrice">Min Price ($)</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPrice">Max Price ($)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="1000"
                    min="0"
                    step="0.01"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minRating">Min Rating</Label>
                  <Input
                    id="minRating"
                    type="number"
                    placeholder="4.0"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
