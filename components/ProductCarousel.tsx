"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";

interface ProductCarouselProps {
  queryId: Id<"queries">;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  source?: string;
  limit?: number;
  onSaveProduct?: (productId: string) => void;
}

export function ProductCarousel({
  queryId,
  minPrice,
  maxPrice,
  minRating,
  source,
  limit,
  onSaveProduct,
}: ProductCarouselProps) {
  // Fetch products with optional filters
  const products = useQuery(
    api.products.getFilteredProducts,
    minPrice !== undefined || maxPrice !== undefined || minRating !== undefined || source
      ? {
          queryId,
          minPrice,
          maxPrice,
          minRating,
          source,
          limit,
        }
      : { queryId, limit }
  );

  // Fetch query status
  const query = useQuery(api.queries.getQueryStatus, { queryId });

  if (products === undefined || query === undefined) {
    return <ProductCarouselSkeleton />;
  }

  if (query.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Search Failed</AlertTitle>
        <AlertDescription>
          There was an error searching for products. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (query.status === "searching" || query.status === "pending") {
    return (
      <div className="space-y-4">
        <Alert>
          <Search className="h-4 w-4 animate-spin" />
          <AlertTitle>Searching...</AlertTitle>
          <AlertDescription>
            We are searching for the best products for: <strong>{query.searchText}</strong>
          </AlertDescription>
        </Alert>
        <ProductCarouselSkeleton />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Alert>
        <Search className="h-4 w-4" />
        <AlertTitle>No Products Found</AlertTitle>
        <AlertDescription>
          No products found matching your criteria. Try adjusting your filters or search again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {products.length} Product{products.length !== 1 ? "s" : ""} Found
        </h2>
        <p className="text-sm text-muted-foreground">
          For: <strong>{query.searchText}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} onSave={onSaveProduct} />
        ))}
      </div>
    </div>
  );
}

function ProductCarouselSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
