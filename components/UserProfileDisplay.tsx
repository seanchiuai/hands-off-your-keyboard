"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, User, TrendingUp, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserProfileDisplayProps {
  onEditClick?: () => void;
  onLearnClick?: () => void;
}

export function UserProfileDisplay({
  onEditClick,
  onLearnClick,
}: UserProfileDisplayProps) {
  const preferences = useQuery(api.userPreferences.getUserPreferences);
  const stats = useQuery(api.interactionSignals.getInteractionStats);
  const trending = useQuery(api.personalizedSearch.getTrendingCategories);

  if (preferences === undefined || stats === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Preferences
          </CardTitle>
          <CardDescription>
            No preferences set yet. Start shopping to build your profile!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Your Shopping Preferences</CardTitle>
            </div>
            <div className="flex gap-2">
              {onLearnClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLearnClick}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Update Profile
                </Button>
              )}
              {onEditClick && (
                <Button variant="outline" size="sm" onClick={onEditClick}>
                  Edit Preferences
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Last updated:{" "}
            {new Date(preferences.lastUpdated).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Style Preferences */}
          <div>
            <h3 className="text-sm font-medium mb-2">Style</h3>
            <div className="flex flex-wrap gap-2">
              {preferences.style.length > 0 ? (
                preferences.style.map((style) => (
                  <Badge key={style} variant="secondary">
                    {style}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No style preferences set</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Budget Range */}
          <div>
            <h3 className="text-sm font-medium mb-2">Budget Range</h3>
            {preferences.budget ? (
              <p className="text-sm">
                ${preferences.budget.min.toLocaleString()} - $
                {preferences.budget.max.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No budget range set</p>
            )}
          </div>

          <Separator />

          {/* Size Preferences */}
          <div>
            <h3 className="text-sm font-medium mb-2">Sizes</h3>
            <div className="flex flex-wrap gap-2">
              {preferences.size.length > 0 ? (
                preferences.size.map((size) => (
                  <Badge key={size} variant="outline">
                    {size}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No size preferences set</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Product Categories */}
          <div>
            <h3 className="text-sm font-medium mb-2">Favorite Categories</h3>
            <div className="flex flex-wrap gap-2">
              {preferences.productCategories.length > 0 ? (
                preferences.productCategories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No category preferences set
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Brands */}
          <div>
            <h3 className="text-sm font-medium mb-2">Preferred Brands</h3>
            <div className="flex flex-wrap gap-2">
              {preferences.brands.length > 0 ? (
                preferences.brands.map((brand) => (
                  <Badge key={brand} variant="outline">
                    {brand}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No brand preferences set</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Colors */}
          <div>
            <h3 className="text-sm font-medium mb-2">Preferred Colors</h3>
            <div className="flex flex-wrap gap-2">
              {preferences.colors.length > 0 ? (
                preferences.colors.map((color) => (
                  <Badge key={color} variant="secondary">
                    {color}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No color preferences set</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Your Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Interactions</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.saves}</p>
                <p className="text-sm text-muted-foreground">Items Saved</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.purchases}</p>
                <p className="text-sm text-muted-foreground">Purchases</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.views}</p>
                <p className="text-sm text-muted-foreground">Product Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.voiceQueries}</p>
                <p className="text-sm text-muted-foreground">Voice Queries</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.clicks}</p>
                <p className="text-sm text-muted-foreground">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Categories */}
      {trending && trending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Trending Categories</CardTitle>
            <CardDescription>Based on your recent activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trending.map(({ category, count }) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm">{category}</span>
                  <Badge variant="secondary">{count} interactions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
