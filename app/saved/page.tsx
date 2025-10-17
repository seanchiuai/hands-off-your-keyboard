"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, Trash2 } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function SavedProductsPage() {
  const { toast } = useToast();

  // Query saved items
  const savedItems = useQuery(api.preferenceItemsManagement.getSavedItems);

  // Mutations
  const removeSavedItem = useMutation(api.preferenceItemsManagement.removeSavedItem);

  const handleRemove = async (productId: string) => {
    try {
      await removeSavedItem({ productId });
      toast({
        title: "Product removed",
        description: "Removed from your saved products",
      });
    } catch (error) {
      console.error("Failed to remove product:", error);
      toast({
        title: "Error",
        description: "Failed to remove product. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Products</h1>
        <p className="text-muted-foreground">
          Products you've saved from your voice shopping sessions
        </p>
      </div>

      {/* Products Grid */}
      {savedItems && savedItems.length > 0 ? (
        <div>
          <div className="mb-4 text-sm text-muted-foreground">
            {savedItems.length} saved product{savedItems.length !== 1 ? "s" : ""}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedItems.map((item) => (
              <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative w-full aspect-square bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Heart className="h-16 w-16" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">
                      {item.productName}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.summary}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saved on {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Product
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <Heart className="h-24 w-24 text-muted-foreground/50 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No saved products yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start using voice shopping to find and save products you love. Your saved items will appear here.
            </p>
            <Button asChild>
              <a href="/">Start Shopping</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
