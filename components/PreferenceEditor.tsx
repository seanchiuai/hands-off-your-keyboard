"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface PreferenceEditorProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function PreferenceEditor({ onSave, onCancel }: PreferenceEditorProps) {
  const preferences = useQuery(api.userPreferences.getUserPreferences);
  const updatePreferences = useMutation(api.userPreferences.updateUserPreferences);

  // Local state for editing
  const [style, setStyle] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [size, setSize] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Input fields for adding new items
  const [newStyle, setNewStyle] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newColor, setNewColor] = useState("");

  // Load preferences when they're fetched
  useEffect(() => {
    if (preferences) {
      setStyle(preferences.style || []);
      setBudgetMin(preferences.budget?.min.toString() || "");
      setBudgetMax(preferences.budget?.max.toString() || "");
      setSize(preferences.size || []);
      setCategories(preferences.productCategories || []);
      setBrands(preferences.brands || []);
      setColors(preferences.colors || []);
    }
  }, [preferences]);

  const addItem = (value: string, setter: (items: string[]) => void, currentItems: string[]) => {
    if (value.trim() && !currentItems.includes(value.trim())) {
      setter([...currentItems, value.trim()]);
      return true;
    }
    return false;
  };

  const removeItem = (value: string, setter: (items: string[]) => void, currentItems: string[]) => {
    setter(currentItems.filter((item) => item !== value));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const budget =
        budgetMin && budgetMax
          ? {
              min: parseFloat(budgetMin),
              max: parseFloat(budgetMax),
            }
          : undefined;

      await updatePreferences({
        style: style.length > 0 ? style : undefined,
        budget,
        size: size.length > 0 ? size : undefined,
        productCategories: categories.length > 0 ? categories : undefined,
        brands: brands.length > 0 ? brands : undefined,
        colors: colors.length > 0 ? colors : undefined,
      });

      toast.success("Preferences saved", {
        description: "Your shopping preferences have been updated successfully.",
      });

      onSave?.();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Your Preferences</CardTitle>
        <CardDescription>
          Customize your shopping preferences to get better recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Style Preferences */}
        <div className="space-y-2">
          <Label>Style Preferences</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {style.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1">
                {s}
                <button
                  onClick={() => removeItem(s, setStyle, style)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., minimalist, modern, vintage"
              value={newStyle}
              onChange={(e) => setNewStyle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addItem(newStyle, setStyle, style)) {
                    setNewStyle("");
                  }
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (addItem(newStyle, setStyle, style)) {
                  setNewStyle("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Budget Range */}
        <div className="space-y-2">
          <Label>Budget Range (USD)</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder="Min"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="Max"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
        </div>

        {/* Size Preferences */}
        <div className="space-y-2">
          <Label>Size Preferences</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {size.map((s) => (
              <Badge key={s} variant="outline" className="gap-1">
                {s}
                <button
                  onClick={() => removeItem(s, setSize, size)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., M, L, XL"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addItem(newSize, setSize, size)) {
                    setNewSize("");
                  }
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (addItem(newSize, setSize, size)) {
                  setNewSize("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product Categories */}
        <div className="space-y-2">
          <Label>Favorite Categories</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {categories.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1">
                {c}
                <button
                  onClick={() => removeItem(c, setCategories, categories)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., furniture, electronics, clothing"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addItem(newCategory, setCategories, categories)) {
                    setNewCategory("");
                  }
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (addItem(newCategory, setCategories, categories)) {
                  setNewCategory("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Brands */}
        <div className="space-y-2">
          <Label>Preferred Brands</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {brands.map((b) => (
              <Badge key={b} variant="outline" className="gap-1">
                {b}
                <button
                  onClick={() => removeItem(b, setBrands, brands)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., IKEA, Nike, Apple"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addItem(newBrand, setBrands, brands)) {
                    setNewBrand("");
                  }
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (addItem(newBrand, setBrands, brands)) {
                  setNewBrand("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-2">
          <Label>Preferred Colors</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {colors.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1">
                {c}
                <button
                  onClick={() => removeItem(c, setColors, colors)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., blue, black, neutral"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (addItem(newColor, setColors, colors)) {
                    setNewColor("");
                  }
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => {
                if (addItem(newColor, setColors, colors)) {
                  setNewColor("");
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
