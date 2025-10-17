"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, Package, Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface ProductCardProps {
  product: {
    _id: string;
    title: string;
    imageUrl?: string;
    productUrl: string;
    price: number;
    currency: string;
    description?: string;
    reviewsCount?: number;
    rating?: number;
    availability: boolean;
    source: string;
    systemRank: number;
  };
  onSave?: (productId: string) => void;
}

export function ProductCard({ product, onSave }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  };

  const handleWishlistToggle = () => {
    setIsWishlisted(!isWishlisted);
    setIsAnimating(true);
    toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleAddToCart = () => {
    setIsInCart(true);
    setIsAnimating(true);
    toast.success("Added to cart!");
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Card className="product-card w-full h-full flex flex-col">
      {/* Wishlist Heart */}
      <button
        onClick={handleWishlistToggle}
        className={`wishlist-heart ${isWishlisted ? 'active' : ''} ${isAnimating ? 'wishlist-heart-animation' : ''}`}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
      </button>

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-shopping-title line-clamp-2">{product.title}</CardTitle>
          <Badge variant={product.availability ? "default" : "secondary"} className="shrink-0">
            {product.availability ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span className="text-sm font-medium">{product.source}</span>
          {product.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              {product.reviewsCount && (
                <span className="text-xs text-muted-foreground">({product.reviewsCount})</span>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {product.imageUrl ? (
          <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-muted rounded-md flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}

        {product.description && (
          <p className="text-shopping-description line-clamp-3">{product.description}</p>
        )}

        <div className="pt-2">
          <p className="text-shopping-price">{formatPrice(product.price, product.currency)}</p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 interactive-button enhanced-focus" 
          onClick={handleAddToCart}
          disabled={!product.availability}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {isInCart ? "In Cart" : "Add to Cart"}
        </Button>
        <Button variant="default" className="interactive-button enhanced-focus" asChild>
          <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
            View
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
        {onSave && (
          <Button 
            variant="outline" 
            className="interactive-button enhanced-focus" 
            onClick={() => onSave(product._id)}
          >
            Save
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
