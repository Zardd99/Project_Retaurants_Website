import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";

// hooks
import useMenuItemData from "./hooks/useMenuItemData";
import useCartActions from "./hooks/useCartActions";
import useReviews from "./hooks/useReviews";
import useOrder from "./hooks/useOrder";

// components
import ProductDetails from "./components/ProductDetails";
import SizeOptions from "./components/SizeOptions";
import AddOnOptions from "./components/AddOnOptions";
import QuantitySelector from "./components/QuantitySelector";
import ReviewForm from "./components/ReviewForm";
import ReviewList from "./components/ReviewList";
import ErrorBoundary from "../../../ErrorBoundary";
import CartContent from "./components/CartContent";
import CartSummary from "./components/CartSummary";
import OrderStatusIndicator from "./components/OrderStatusIndicator";

// context
import { UserAuth } from "../../../context/AuthContext";
import { CartProvider } from "../../../context/CardContext";

// constants
import { SIZE_OPTIONS, ADD_ON_OPTIONS, INITIAL_STATE } from "./constants";

const MenuItemDetail = () => {
  const { itemId } = useParams();
  const { session } = UserAuth();

  //
  // State
  //
  const [state, setState] = useState(INITIAL_STATE);
  const {
    quantity,
    selectedSize,
    selectedAddOns,
    showReviewForm,
    newComment,
    newRating,
    isAddingToCart,
    notification,
  } = state;

  //
  // Custom hooks
  //
  const {
    menuItem,
    isAdmin,
    refetch,
    error: menuError,
  } = useMenuItemData(itemId, session);
  const { addToCart, clearCart, loading } = useCartActions(session);
  const {
    buyNowDirect,
    isProcessing: isOrderProcessing,
    orderStatus,
  } = useOrder(session);
  const { comments, fetchComments, submitReview, deleteReview, updateReview } =
    useReviews(itemId, session, isAdmin);

  //
  // Calc Total Price
  //
  const totalPrice = useMemo(() => {
    if (!menuItem?.price_tag) return 0;

    const basePrice = parseFloat(menuItem.price_tag.replace("$", ""));
    if (isNaN(basePrice)) return 0;

    const sizeMultiplier =
      SIZE_OPTIONS.find((s) => s.id === selectedSize)?.multiplier || 1;
    const sizedPrice = basePrice * sizeMultiplier;

    const addOnTotal = selectedAddOns.reduce((total, id) => {
      const addOn = ADD_ON_OPTIONS.find((o) => o.id === id);
      return total + (addOn?.price || 0);
    }, 0);

    return (sizedPrice + addOnTotal) * quantity;
  }, [menuItem, selectedSize, selectedAddOns, quantity]);

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const showNotification = useCallback(
    (message, type = "success") => {
      updateState({ notification: { message, type } });
      setTimeout(() => updateState({ notification: null }), 3000);
    },
    [updateState]
  );

  const handleError = useCallback(
    (error, context = "") => {
      console.error(`Error in ${context}:`, error);
      showNotification(
        `${context ? context + ": " : ""}${error.message}`,
        "error"
      );
    },
    [showNotification]
  );

  //
  // Account Checking
  //
  const requireAuth = useCallback(
    (action) => {
      if (!session) {
        showNotification("Please login to " + action, "warning");
        return false;
      }
      return true;
    },
    [session, showNotification]
  );

  useEffect(() => {
    if (itemId) {
      fetchComments().catch((error) => handleError(error, "Loading reviews"));
    }
  }, [itemId, fetchComments, handleError]);

  //
  //
  //

  // handle function

  //
  // add to cart
  //
  const handleAddToCart = useCallback(
    async (options = { suppressAlert: false }) => {
      if (!requireAuth("add items to cart")) return { success: false };

      updateState({ isAddingToCart: true });

      try {
        const result = await addToCart(
          itemId,
          menuItem,
          selectedSize,
          selectedAddOns,
          quantity,
          totalPrice
        );

        if (result.success && !options.suppressAlert) {
          showNotification(result.message);
        }
        return result;
      } catch (error) {
        handleError(error, "Adding to cart");
        return { success: false, message: error.message };
      } finally {
        updateState({ isAddingToCart: false });
      }
    },
    [
      requireAuth,
      updateState,
      addToCart,
      itemId,
      menuItem,
      selectedSize,
      selectedAddOns,
      quantity,
      totalPrice,
      showNotification,
      handleError,
    ]
  );

  //
  // buy now click
  //
  const handleBuyNow = useCallback(async () => {
    if (!requireAuth("place an order")) return;

    if (isOrderProcessing || isAddingToCart) {
      console.warn("Order already in progress");
      return;
    }

    try {
      //
      // This block of code will made the "Buy now" button do two job at the same time
      // if the cart not exist it will automatic add the default items to cart and buy the item in the cart

      // const addResult = await handleAddToCart({ suppressAlert: true });
      // if (!addResult.success) {
      //   throw new Error(addResult.message);
      // }

      //
      //

      const orderResult = await buyNowDirect(
        itemId,
        menuItem,
        selectedSize,
        selectedAddOns,
        quantity,
        totalPrice
      );

      if (orderResult.success) {
        try {
          await clearCart();
          console.log("Cart cleared successfully after order");
        } catch (clearError) {
          console.error("Failed to clear cart after order:", clearError);
        }

        showNotification(
          `Order #${
            orderResult.orderId
          } placed successfully! Total: ${orderResult.total.toFixed(2)}`
        );
      } else {
        throw new Error(orderResult.message);
      }
    } catch (error) {
      handleError(error, "Placing order");
    }
  }, [
    requireAuth,
    buyNowDirect,
    itemId,
    menuItem,
    selectedSize,
    selectedAddOns,
    quantity,
    totalPrice,
    showNotification,
    handleError,
    isOrderProcessing,
    isAddingToCart,
    // handleAddToCart,
    clearCart,
  ]);

  const handleAddOnToggle = useCallback(
    (addOnId) => {
      updateState({
        selectedAddOns: selectedAddOns.includes(addOnId)
          ? selectedAddOns.filter((id) => id !== addOnId)
          : [...selectedAddOns, addOnId],
      });
    },
    [selectedAddOns, updateState]
  );

  //
  // Submit Review
  //
  const handleSubmitReview = useCallback(
    async (e) => {
      e.preventDefault();
      if (!requireAuth("submit a review")) return;

      try {
        await submitReview(newComment, newRating);
        await fetchComments();
        await refetch();
        updateState({
          newComment: "",
          newRating: 5,
          showReviewForm: false,
        });
        showNotification("Review submitted successfully!");
      } catch (error) {
        handleError(error, "Submitting review");
      }
    },
    [
      requireAuth,
      submitReview,
      newComment,
      newRating,
      fetchComments,
      refetch,
      updateState,
      showNotification,
      handleError,
    ]
  );

  //
  // Delete Review
  //
  const handleDeleteReview = useCallback(
    async (commentId, userId) => {
      try {
        await deleteReview(commentId, userId);
        await fetchComments();
        await refetch();
        showNotification("Review deleted successfully!");
      } catch (error) {
        handleError(error, "Deleting review");
      }
    },
    [deleteReview, fetchComments, refetch, showNotification, handleError]
  );

  //
  // Edit Review
  //
  const handleUpdateReview = useCallback(
    async (commentId, text, rating) => {
      try {
        await updateReview(commentId, text, rating);
        await fetchComments();
        await refetch();
        showNotification("Review updated successfully!");
      } catch (error) {
        handleError(error, "Updating review");
      }
    },
    [updateReview, fetchComments, refetch, showNotification, handleError]
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        {" "}
        Loading, Please make sure to have an account to continue.{" "}
      </div>
    );

  if (menuError) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <div className="bg-hero-red-100 border border-hero-red-400 text-hero-red-700 px-4 py-3 rounded">
          Error loading menu item: {menuError.message}
        </div>
      </div>
    );
  }

  if (!menuItem) {
    return (
      <div className="container mx-auto p-4 lg:p-8">
        <div className="text-center py-8">
          <p className="text-hero-gray-500">Menu item not found</p>
          <Link
            to="/"
            className="cal-sans-bold text-hero-red-600 hover:underline mt-4 inline-block"
          >
            &larr; Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto min-w-screen min-h-screen pt-20 md:pt-30">
      <ErrorBoundary>
        <div className="container mx-auto p-4 lg:p-8 w-full">
          <div className="mb-6">
            <Link
              to="/"
              className="cal-sans-bold text-hero-red-600 hover:underline"
            >
              &larr; Back to Menu
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-1">
              <div className="bg-light rounded-2xl overflow-hidden shadow-lg h-full">
                {menuItem.image_url ? (
                  <img
                    src={menuItem.image_url}
                    alt={menuItem.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentNode.innerHTML = `
                      <div class="bg-light border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center text-hero-gray-700">
                        Image not available
                      </div>
                    `;
                    }}
                  />
                ) : (
                  <div className="bg-regular-hover border-2 border-dashed rounded-xl w-full h-64 flex items-center justify-center text-hero-gray-700">
                    No image available
                  </div>
                )}
              </div>
            </div>

            <ProductDetails
              menuItem={menuItem}
              totalPrice={totalPrice}
              quantity={quantity}
            >
              <SizeOptions
                sizes={SIZE_OPTIONS}
                selectedSize={selectedSize}
                onSelectSize={(size) => updateState({ selectedSize: size })}
                basePrice={parseFloat(menuItem.price_tag.replace("$", "")) || 0}
              />

              <AddOnOptions
                addOns={ADD_ON_OPTIONS}
                selectedAddOns={selectedAddOns}
                onToggleAddOn={handleAddOnToggle}
              />

              <QuantitySelector
                quantity={quantity}
                onQuantityChange={(qty) => updateState({ quantity: qty })}
              />

              <div className="space-y-4 flex flex-col w-fit">
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !menuItem}
                  className="group relative overflow-hidden bg-gradient-to-r from-hero-orange-500 to-hero-red-500 hover:from-hero-orange-600 hover:to-hero-red-600 text-hero-white font-semibold px-8 py-4 rounded-full shadow-2xl hover:shadow-[0_10px_30px_rgba(249,115,22,0.25)] transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-hero-white/20 backdrop-blur-sm p-2 rounded-full group-hover:rotate-12 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                    </div>
                    <span className="text-lg">
                      {" "}
                      {isAddingToCart ? "Adding..." : "Add to Cart"}
                    </span>
                  </div>
                  <div className="absolute inset-0 -top-[200%] bg-gradient-to-r from-transparent via-hero-white/30 to-transparent skew-y-12 group-hover:top-[200%] transition-all duration-700"></div>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isAddingToCart || isOrderProcessing || !menuItem}
                  className="group relative overflow-hidden bg-gradient-to-r from-offer-fresh-500 to-offer-cool-500 hover:from-offer-fresh-600 hover:to-offer-cool-600 text-hero-white font-semibold px-8 py-4 rounded-full shadow-2xl hover:shadow-[0_10px_30px_rgba(249,115,22,0.25)] transition-all duration-300 transform hover:scale-105"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-hero-white/20 backdrop-blur-sm p-2 rounded-full group-hover:rotate-12 transition-transform duration-300">
                      <svg
                        className="w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                        />
                      </svg>
                    </div>
                    <span className="text-lg">
                      {isOrderProcessing ? "Processing..." : "Buy Now"}
                    </span>
                  </div>
                  <div className="absolute inset-0 -top-[200%] bg-gradient-to-r from-transparent via-hero-white/30 to-transparent skew-y-12 group-hover:top-[200%] transition-all duration-700"></div>
                </button>
              </div>
            </ProductDetails>
            <CartProvider>
              <div className="z-20">
                <CartContent />
              </div>
              <div className="lg:col-span-1">
                <CartSummary />
              </div>
            </CartProvider>
            {/*  */}
            {/* Order Notify */}
            {/*  */}
            {notification && (
              <div
                className={`mb-4 p-4 rounded-lg ${
                  notification.type === "error"
                    ? "bg-hero-red-100 text-hero-red-500 border border-hero-red-100"
                    : notification.type === "warning"
                    ? "bg-hero-yellow-100 text-hero-red-600 border border-hero-yellow-100"
                    : "bg-offer-fresh-500 text-hero-gray-900 border border-offer-fresh-50"
                }`}
              >
                {notification.message}
              </div>
            )}
          </div>

          {orderStatus && <OrderStatusIndicator orderStatus={orderStatus} />}

          {/* Reviews */}
          <div className="bg-gradient-to-r from-hero-orange-50 to-hero-red-100 rounded-3xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="cal-sans-bold text-2xl lg:text-3xl">
                Customer Reviews
              </h2>
              {session ? (
                <button
                  onClick={() =>
                    updateState({ showReviewForm: !showReviewForm })
                  }
                  className="group flex items-center gap-3 font-semibold px-6 py-2 bg-hero-red-500 text-light hover:bg-hero-white/50 rounded-full transition-all duration-300 backdrop-blur-sm"
                >
                  <span className="text-lg group-hover:text-hero-orange-600 transition-colors duration-300">
                    {showReviewForm ? "Hide Form" : "Write Review"}
                  </span>
                </button>
              ) : (
                <Link
                  className="group flex items-center gap-3 font-semibold px-6 py-2 bg-hero-red-500 text-light hover:bg-hero-white/50 rounded-full transition-all duration-300 backdrop-blur-sm"
                  to="/login"
                >
                  Create and Account or Login to Review
                </Link>
              )}
            </div>

            {showReviewForm && session && (
              <ReviewForm
                onSubmit={handleSubmitReview}
                onCancel={() => updateState({ showReviewForm: false })}
                rating={newRating}
                setRating={(rating) => updateState({ newRating: rating })}
                comment={newComment}
                setComment={(comment) => updateState({ newComment: comment })}
              />
            )}

            <ReviewList
              comments={comments}
              onDelete={handleDeleteReview}
              onUpdate={handleUpdateReview}
              isAdmin={isAdmin}
              currentUserId={session?.user.id}
            />
          </div>
        </div>
      </ErrorBoundary>
    </section>
  );
};

export default MenuItemDetail;
