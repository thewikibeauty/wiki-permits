كود يخص اللغة والاعلام والعملة بعد تفعيلها في سلة 
// changing the language shape 
window.addEventListener('load', function () {
  const currencyFlags = {
    SAR: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg',
    USD: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg',
    OMR: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Oman.svg',
    KWD: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Flag_of_Kuwait.svg',
    AED: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_United_Arab_Emirates.svg',
    BHD: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Bahrain.svg',
    QAR: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg'
  };
  const btn = document.querySelector('button[onclick*="localization::open"]');
  const modal = document.querySelector('salla-localization-modal');

  if (!btn || !modal) return;
  const currentCurrency = modal.getAttribute('currency') || 'SAR';
  const flag = currencyFlags[currentCurrency] || currencyFlags.SAR;
  btn.innerHTML = `
    <img src="${flag}" style="width:28px;height:20px;object-fit:cover;border-radius:3px;display:block;">
    <span style="font-size:14px;margin-inline-start:6px;">⌄</span>
  `;
  btn.style.background = 'transparent';
  btn.style.border = '0';
  btn.style.padding = '0';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.cursor = 'pointer';
});


// WIKI BEAUTY — UNIFIED REVIEWS + PURCHASES + LIVE VIEWS + PERMITS + FOOTER
(function () {
  "use strict";

  const CONFIG = {
    permitBaseUrl: "https://thewikibeauty.github.io/wiki-permits/",
    permitExtension: ".png",
    liveViewsRefreshMs: 5000,
    observerDelayMs: 250
  };

  const productsDatabase = {
    B001: {
      productId: "1986931535",
      starsBase: { 5: 32, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendedBase: 39,
      purchases: 44
    },
    H001: {
      productId: "612437070",
      starsBase: { 5: 24, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendedBase: 30,
      purchases: 33
    },
    P001: {
      productId: "303065417",
      starsBase: { 5: 39, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendedBase: 45,
      purchases: 51
    },
    PH001: {
      productId: "1003742533",
      starsBase: { 5: 30, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendedBase: 30,
      purchases: 35
    }
  };
window.WB_PRODUCTS_DEBUG = productsDatabase;
  const productIdToSku = {};
  Object.keys(productsDatabase).forEach(function (sku) {
    const id = productsDatabase[sku].productId;
    if (id) productIdToSku[String(id)] = sku;
  });

  const realReviewsCache = {};
  const realStarsCache = {};
  const realRecommendationCache = {};
  const permitAvailabilityCache = new Map();
  let cachedPageSku = "";
  let lastQuickViewProductId = "";
  let observerTimer = null;

  function isEnglish() {
    const lang = (document.documentElement.lang || "").toLowerCase();
    const path = location.pathname.toLowerCase();
    return lang.indexOf("en") === 0 || path === "/en" || path.indexOf("/en/") === 0;
  }

  function cleanSku(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function emptyStars() {
    return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  }

  function copyStars(stars) {
    stars = stars || {};
    return {
      5: Math.max(0, Number(stars[5] || 0)),
      4: Math.max(0, Number(stars[4] || 0)),
      3: Math.max(0, Number(stars[3] || 0)),
      2: Math.max(0, Number(stars[2] || 0)),
      1: Math.max(0, Number(stars[1] || 0))
    };
  }

  function getBaseStars(productData) {
    return copyStars(productData && productData.starsBase);
  }

  function getStarsTotal(stars) {
    stars = stars || {};
    return [5, 4, 3, 2, 1].reduce(function (sum, star) {
      return sum + Number(stars[star] || 0);
    }, 0);
  }

  function getBaseReviews(productData) {
    return getStarsTotal(getBaseStars(productData));
  }

  function getBaseRecommended(productData) {
    const total = getBaseReviews(productData);
    return Math.min(total, Math.max(0, Number(productData && productData.recommendedBase || 0)));
  }

  function mergeStars(baseStars, realStars) {
    const result = emptyStars();
    [5, 4, 3, 2, 1].forEach(function (star) {
      result[star] = Number(baseStars[star] || 0) + Number(realStars[star] || 0);
    });
    return result;
  }

  function calculatePercentage(value, total) {
    return total > 0 ? (Number(value || 0) / Number(total)) * 100 : 0;
  }

  function formatPercentage(value) {
    const number = Number(value || 0);
    return Math.abs(number - Math.round(number)) < 0.005
      ? String(Math.round(number))
      : number.toFixed(2).replace(/\.?0+$/, "");
  }

  function parsePercentage(value) {
    const normalized = String(value || "").replace(/[^\d.,-]/g, "").replace(",", ".");
    const number = parseFloat(normalized);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
  }

  function parseReviewsNumber(value) {
    const match = String(value || "").replace(/,/g, "").match(/\d+/);
    return match ? parseInt(match[0], 10) || 0 : 0;
  }

  function percentagesToStarCounts(totalReviews, percentages) {
    const result = emptyStars();
    totalReviews = Math.max(0, Math.round(Number(totalReviews || 0)));
    if (!totalReviews) return result;

    const remainders = [];
    [5, 4, 3, 2, 1].forEach(function (star) {
      const exact = totalReviews * (Number(percentages[star] || 0) / 100);
      result[star] = Math.floor(exact);
      remainders.push({ star: star, remainder: exact - result[star] });
    });

    let remaining = totalReviews - getStarsTotal(result);
    remainders.sort(function (a, b) { return b.remainder - a.remainder; });
    let index = 0;
    while (remaining > 0 && remainders.length) {
      result[remainders[index % remainders.length].star] += 1;
      remaining -= 1;
      index += 1;
    }
    return result;
  }

  function getProductData(sku) {
    return productsDatabase[cleanSku(sku)] || null;
  }

  function getElementProductId(container) {
    if (!container) return "";
    const containerId = String(container.id || "");
    if (containerId.indexOf("product-") === 0) return containerId.replace("product-", "");

    const direct = container.getAttribute("product-id") || container.getAttribute("data-product-id") || container.getAttribute("data-id");
    if (direct) return String(direct).trim();

    const input = container.querySelector('input[type="hidden"][name="id"]');
    if (input && input.value) return String(input.value).trim();

    const element = container.querySelector('[product-id], [data-product-id], .btn--wishlist[data-id]');
    if (element) {
      return String(
        element.getAttribute("product-id") ||
        element.getAttribute("data-product-id") ||
        element.getAttribute("data-id") || ""
      ).trim();
    }

    const slider = container.querySelector('salla-slider[id^="quickview-slider-"]');
    return slider ? String(slider.id).replace("quickview-slider-", "").trim() : "";
  }

 function extractSkuFromText(value) {
  const cleaned = cleanSku(value);
  if (!cleaned) return "";

  // أولاً: إذا كان النص يحتوي على Product ID فاعتمد عليه مباشرة
  for (const productId in productIdToSku) {
    if (cleaned.includes(productId)) {
      return productIdToSku[productId];
    }
  }

  // ثانياً: تطابق SKU كامل
  if (productsDatabase[cleaned]) {
    return cleaned;
  }

  // ثالثاً: البحث داخل النص مع إعطاء الأولوية للأطول
  const knownSkus = Object.keys(productsDatabase).sort(function (a, b) {
    return b.length - a.length;
  });

  for (let i = 0; i < knownSkus.length; i++) {
    const sku = cleanSku(knownSkus[i]);
    if (cleaned.includes(sku)) {
      return knownSkus[i];
    }
  }

  const match = cleaned.match(/[A-Z][A-Z0-9_-]{1,39}/);
  return match ? match[0] : "";
}

  function getSkuFromContainer(container) {
    if (!container) return "";

    const attributes = ["data-product-sku", "data-sku", "sku"];
    for (let i = 0; i < attributes.length; i++) {
      const value = container.getAttribute(attributes[i]);
      if (value) return cleanSku(value);
    }

    const selectors = [
      'meta[itemprop="sku"]', '[itemprop="sku"]', '[data-product-sku]', '[data-sku]',
      '.product-sku', '.sku', '.center-between span.text-sm.text-store-text-secondary'
    ];

    for (let i = 0; i < selectors.length; i++) {
      const element = container.querySelector(selectors[i]);
      if (!element) continue;
      const value = element.getAttribute("content") || element.getAttribute("data-product-sku") || element.getAttribute("data-sku") || element.textContent;
      const sku = extractSkuFromText(value);
      if (sku) return sku;
    }

    const productId = getElementProductId(container);
    return productIdToSku[String(productId)] || "";
  }

  function findSkuInJson(data) {
    if (!data) return "";
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const sku = findSkuInJson(data[i]);
        if (sku) return sku;
      }
      return "";
    }
    if (typeof data === "object") {
      if (data.sku) return cleanSku(data.sku);
      for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
        const sku = findSkuInJson(data[key]);
        if (sku) return sku;
      }
    }
    return "";
  }

  function getPageSku() {
    if (cachedPageSku) return cachedPageSku;

    const selectors = [
      'meta[itemprop="sku"]', '[itemprop="sku"]', '[data-product-sku]', '[data-sku]',
      '.product-sku', '.sku', '.center-between span.text-sm.text-store-text-secondary'
    ];

    for (let i = 0; i < selectors.length; i++) {
      const element = document.querySelector(selectors[i]);
      if (!element || element.closest("custom-salla-product-card") || element.closest(".quickview__content")) continue;
      const value = element.getAttribute("content") || element.getAttribute("data-product-sku") || element.getAttribute("data-sku") || element.textContent;
      const sku = extractSkuFromText(value);
      if (sku) return (cachedPageSku = sku);
    }

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      try {
        const sku = findSkuInJson(JSON.parse(scripts[i].textContent));
        if (sku) return (cachedPageSku = sku);
      } catch (error) {}
    }

    const url = location.href;
    for (const productId in productIdToSku) {
      if (url.indexOf(productId) !== -1) return (cachedPageSku = productIdToSku[productId]);
    }
    return "";
  }

  function generateDynamicViews(productId) {
    productId = String(productId || "prod-default");
    const numericValue = parseInt(productId.replace(/\D/g, ""), 10) || productId.split("").reduce(function (total, char) {
      return total + char.charCodeAt(0);
    }, 0);
    const step = Math.floor(Date.now() / CONFIG.liveViewsRefreshMs);
    const base = 15 + ((numericValue * 7) % 39);
    const offset = Math.floor(Math.abs(Math.sin(numericValue * 5432 + step * 1235)) * 7) - 3;
    return Math.max(10, Math.min(60, base + offset));
  }

  function getNativeRealReviews(ratingElement, sku) {
    if (!ratingElement) return Number(realReviewsCache[sku] || 0);

    const saved = ratingElement.getAttribute("data-wb-real-reviews");
    let candidate = saved !== null
      ? parseReviewsNumber(saved)
      : parseReviewsNumber(ratingElement.getAttribute("reviews"));

    if (!candidate) {
      const text = ratingElement.querySelector(".s-rating-stars-reviews");
      if (text) candidate = parseReviewsNumber(text.textContent);
    }

    const base = getBaseReviews(getProductData(sku));
    const cached = Number(realReviewsCache[sku] || 0);
    if (cached > 0 && candidate === base + cached) candidate = cached;

    if (candidate > 0) {
      if (cached !== candidate) {
        delete realStarsCache[sku];
        delete realRecommendationCache[sku];
      }
      realReviewsCache[sku] = candidate;
    }

    ratingElement.setAttribute("data-wb-real-reviews", String(Number(realReviewsCache[sku] || candidate || 0)));
    return Number(realReviewsCache[sku] || candidate || 0);
  }

  function getMainSummaryRows() {
    return Array.prototype.filter.call(document.querySelectorAll(".s-reviews-summary-row"), function (row) {
      return !row.closest(".quickview__content") && !row.closest("custom-salla-product-card");
    });
  }

  function readRealStarsFromSummary(sku, realReviews) {
    if (realStarsCache[sku]) return copyStars(realStarsCache[sku]);
    if (!realReviews) return emptyStars();

    const percentages = emptyStars();
    let found = 0;
    getMainSummaryRows().forEach(function (row) {
      const rate = row.querySelector(".s-reviews-summary-row-rate");
      const percent = row.querySelector(".s-reviews-summary-percentage");
      if (!rate || !percent) return;
      const match = String(rate.textContent || "").match(/[1-5]/);
      if (!match) return;
      percentages[Number(match[0])] = parsePercentage(percent.textContent);
      found += 1;
    });

    if (!found) return emptyStars();
    realStarsCache[sku] = percentagesToStarCounts(realReviews, percentages);
    return copyStars(realStarsCache[sku]);
  }

  function readRealRecommendedFromSummary(sku, realReviews) {
    if (Object.prototype.hasOwnProperty.call(realRecommendationCache, sku)) {
      return Number(realRecommendationCache[sku] || 0);
    }
    if (!realReviews) return 0;

    const element = document.querySelector("salla-reviews-summary .s-reviews-summary-recommendation-percentage");
    if (!element) return 0;
    const percentage = parsePercentage(element.textContent);
    const count = Math.min(realReviews, Math.max(0, Math.round(realReviews * percentage / 100)));
    realRecommendationCache[sku] = count;
    return count;
  }

  function updateMainReviewsSummary(sku, productData, realReviews, totalReviews, isEn) {
    const summary = document.querySelector("salla-reviews-summary");
    if (!summary) return;

    const finalStars = mergeStars(getBaseStars(productData), readRealStarsFromSummary(sku, realReviews));
    const finalTotal = getStarsTotal(finalStars);

    getMainSummaryRows().forEach(function (row) {
      const rate = row.querySelector(".s-reviews-summary-row-rate");
      if (!rate) return;
      const match = String(rate.textContent || "").match(/[1-5]/);
      if (!match) return;
      const star = Number(match[0]);
      const percentage = calculatePercentage(finalStars[star], finalTotal);
      const percentageElement = row.querySelector(".s-reviews-summary-percentage");
      const progress = row.querySelector(".s-progress-bar-progress");
      if (percentageElement) percentageElement.textContent = formatPercentage(percentage) + "%";
      if (progress) progress.style.width = percentage + "%";
      row.setAttribute("data-wb-star-count", String(finalStars[star]));
    });

    const finalRecommended = Math.min(
      totalReviews,
      getBaseRecommended(productData) + readRealRecommendedFromSummary(sku, realReviews)
    );
    const recommendation = formatPercentage(calculatePercentage(finalRecommended, totalReviews));

    summary.querySelectorAll(".s-reviews-summary-recommendation-percentage").forEach(function (element) {
      element.textContent = isEn ? recommendation + "%" : "%" + recommendation;
    });
  }

  function forceFiveStars(ratingElement, totalReviews, isEn, hideCount) {
    if (!ratingElement) return;

    if (totalReviews <= 0) {
      ratingElement.style.display = "none";
      return;
    }

    ratingElement.style.display = "";
    ["value", "rating", "rate", "stars"].forEach(function (attr) {
      ratingElement.setAttribute(attr, "5");
    });
    ratingElement.setAttribute("reviews", String(totalReviews));

    const count = ratingElement.querySelector(".s-rating-stars-reviews");
    if (count) {
      if (hideCount) {
        count.style.display = "none";
        count.setAttribute("aria-hidden", "true");
      } else {
        count.style.display = "";
        count.removeAttribute("aria-hidden");
        count.textContent = isEn ? `(${totalReviews} reviews)` : `(${totalReviews} تقييم)`;
      }
    }
  }

  function createFixedStars(isEn) {
    const wrapper = document.createElement("div");
    wrapper.className = "wb-fixed-stars";
    wrapper.setAttribute("aria-label", isEn ? "5 out of 5 stars" : "5 من 5 نجوم");
    wrapper.innerHTML = '<i class="sicon-star2"></i><i class="sicon-star2"></i><i class="sicon-star2"></i><i class="sicon-star2"></i><i class="sicon-star2"></i>';
    return wrapper;
  }

  function getCardReviewTotal(card, sku) {
    const productData = getProductData(sku);
    const base = getBaseReviews(productData);
    const nativeRating = card.querySelector("salla-rating-stars");
    const real = getNativeRealReviews(nativeRating, sku);
    return base + real;
  }

  function processProductCards(isEn) {
    document.querySelectorAll("custom-salla-product-card").forEach(function (card) {
      const productId = getElementProductId(card);
      if (!productId) return;

      const sku = getSkuFromContainer(card) || productIdToSku[String(productId)] || "";
      const title = card.querySelector(".product-card__title");
      if (!title) return;

      let views = card.querySelector(".salla-card-live-views");
      if (!views) {
        views = document.createElement("div");
        views.className = "salla-card-live-views";
        views.innerHTML = '<i class="sicon-eye"></i><span class="salla-views-text"></span>';
        title.insertAdjacentElement("afterend", views);
      }
      const viewsCount = generateDynamicViews(productId);
      const viewsText = views.querySelector(".salla-views-text");
      if (viewsText) viewsText.textContent = isEn ? `${viewsCount} watching now` : `${viewsCount} يشاهدون هذا الآن`;

      const nativeRating = card.querySelector("salla-rating-stars");
      const totalReviews = getCardReviewTotal(card, sku);
      if (nativeRating) nativeRating.style.display = "none";

      let stars = card.querySelector(".wb-card-rating");
      if (totalReviews > 0) {
        if (!stars) {
          stars = document.createElement("div");
          stars.className = "wb-card-rating";
          stars.appendChild(createFixedStars(isEn));
          views.insertAdjacentElement("afterend", stars);
        }
      } else if (stars) {
        stars.remove();
      }

      if (sku) addPermitToContainer(card, sku, "card", stars || views);
    });
  }

  function getMainProductPriceTarget() {
    const elements = document.querySelectorAll(".product-price, .price, .product__price, [data-price], .main-price");
    for (let i = 0; i < elements.length; i++) {
      if (!elements[i].closest(".quickview__content") && !elements[i].closest("custom-salla-product-card")) return elements[i];
    }
    return null;
  }

  function findMainRealReviews(sku) {
    const ratings = document.querySelectorAll("salla-rating-stars");
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      if (rating.closest(".quickview__content") || rating.closest("custom-salla-product-card") || rating.closest("salla-comment-item")) continue;
      return getNativeRealReviews(rating, sku);
    }
    return Number(realReviewsCache[sku] || 0);
  }

  function updateMainProductRatings(sku, productData, isEn) {
    const realReviews = findMainRealReviews(sku);
    const totalReviews = getBaseReviews(productData) + realReviews;

    document.querySelectorAll("salla-rating-stars").forEach(function (rating) {
      if (rating.closest(".quickview__content") || rating.closest("custom-salla-product-card") || rating.closest("salla-comment-item")) return;
      forceFiveStars(rating, totalReviews, isEn, false);
    });

    const summary = document.querySelector("salla-reviews-summary");
    if (summary) {
      const summaryText = isEn ? `Based on ${totalReviews} reviews` : `بناءً على ${totalReviews} تقييم`;
      const candidates = summary.querySelectorAll(".s-reviews-summary-count, span, p, small, strong, div");
      for (let i = 0; i < candidates.length; i++) {
        const element = candidates[i];
        if (element.children.length > 0) continue;
        const text = String(element.textContent || "").trim().toLowerCase();
        if (text.indexOf("بناءً على") !== -1 || text.indexOf("بناء على") !== -1 || text.indexOf("based on") !== -1) {
          element.textContent = summaryText;
          break;
        }
      }
    }

    updateMainReviewsSummary(sku, productData, realReviews, totalReviews, isEn);
    return totalReviews;
  }

  function processMainProductPage(isEn) {
    const price = getMainProductPriceTarget();
    if (!price) return;

    const sku = getPageSku();
    if (!sku) return;
    const productData = getProductData(sku);
    if (!productData) return;

    updateMainProductRatings(sku, productData, isEn);

    let info = document.getElementById("salla-main-product-information");
    if (!info) {
      info = document.createElement("div");
      info.id = "salla-main-product-information";
      info.className = "salla-product-extra-information";
      price.insertAdjacentElement("afterend", info);
    }

    let views = info.querySelector(".salla-main-page-views");
    if (!views) {
      views = document.createElement("div");
      views.className = "salla-main-page-views salla-live-info";
      views.innerHTML = '<i class="sicon-eye"></i><span class="salla-views-text"></span>';
      info.appendChild(views);
    }
    const count = generateDynamicViews(productData.productId || sku);
    views.querySelector(".salla-views-text").textContent = isEn ? `${count} watching this product now` : `${count} يشاهدون هذا المنتج الآن`;

    let purchases = info.querySelector(".salla-purchased-count");
    if (!purchases) {
      purchases = document.createElement("div");
      purchases.className = "salla-purchased-count pulse-text";
      info.appendChild(purchases);
    }
    purchases.textContent = isEn ? `🔥 Purchased ${productData.purchases} times` : `🔥 تم شراؤه ${productData.purchases} مرة`;

    addPermitToContainer(document, sku, "page", info);
  }

  function getQuickViewContainers() {
    const selectors = [
      ".quickview__content", ".quickview-content", ".product-quickview", ".quickview",
      '[class*="quickview__content"]', '[class*="quickview-content"]',
      'salla-modal[modal-title]', ".s-modal-container"
    ];
    const found = [];
    const seen = new Set();
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (!seen.has(element) && !element.closest("custom-salla-product-card")) {
          seen.add(element);
          found.push(element);
        }
      });
    });
    return found;
  }

  function getQuickViewProductId(quickView) {
    return getElementProductId(quickView) || getElementProductId(quickView.closest("salla-modal, .s-modal-container, .modal") || quickView.parentElement) || lastQuickViewProductId;
  }

  function processQuickViews(isEn) {
    getQuickViewContainers().forEach(function (quickView) {
      const productId = String(getQuickViewProductId(quickView) || "").trim();
      if (!productId) return;

      const sku = getSkuFromContainer(quickView) || productIdToSku[productId] || "";
      const productData = getProductData(sku);
      const nativeRating = quickView.querySelector("salla-rating-stars");
      const realReviews = getNativeRealReviews(nativeRating, sku);
      const totalReviews = getBaseReviews(productData) + realReviews;

      if (nativeRating) nativeRating.style.display = "none";

      let stars = quickView.querySelector(".wb-quickview-rating");
      if (totalReviews > 0) {
        if (!stars) {
          stars = document.createElement("div");
          stars.className = "wb-quickview-rating";
          stars.appendChild(createFixedStars(isEn));
          const title = quickView.querySelector("h1, h2, h3, .product-title, .quickview__title");
          const price = quickView.querySelector(".product-price, .price, .product__price, [data-price], .main-price");
          (title || price || quickView).insertAdjacentElement(title || price ? "afterend" : "beforeend", stars);
        }
      } else if (stars) {
        stars.remove();
      }

      let info = quickView.querySelector(".salla-quickview-information");
      if (!info) {
        info = document.createElement("div");
        info.className = "salla-quickview-information salla-product-extra-information";
        (stars || quickView.querySelector(".product-price, .price, .product__price, [data-price], .main-price") || quickView).insertAdjacentElement(stars ? "afterend" : "beforeend", info);
      }

      let views = info.querySelector(".salla-quickview-views");
      if (!views) {
        views = document.createElement("div");
        views.className = "salla-quickview-views salla-live-info";
        views.innerHTML = '<i class="sicon-eye"></i><span class="salla-views-text"></span>';
        info.appendChild(views);
      }
      const count = generateDynamicViews(productId);
      views.querySelector(".salla-views-text").textContent = isEn ? `${count} watching this product now` : `${count} يشاهدون هذا المنتج الآن`;

      let purchases = info.querySelector(".salla-quickview-purchases");
      if (productData) {
        if (!purchases) {
          purchases = document.createElement("div");
          purchases.className = "salla-quickview-purchases pulse-text";
          info.appendChild(purchases);
        }
        purchases.textContent = isEn ? `🔥 Purchased ${productData.purchases} times` : `🔥 تم شراؤه ${productData.purchases} مرة`;
      } else if (purchases) {
        purchases.remove();
      }

      if (sku) addPermitToContainer(quickView, sku, "quickview", info);
    });
  }

  function getPermitUrl(sku) {
    return CONFIG.permitBaseUrl + encodeURIComponent(cleanSku(sku)) + CONFIG.permitExtension;
  }

  function permitExists(sku) {
    sku = cleanSku(sku);
    if (!sku) return Promise.resolve(false);
    if (permitAvailabilityCache.has(sku)) return permitAvailabilityCache.get(sku);

    const promise = new Promise(function (resolve) {
      const image = new Image();
      image.onload = function () { resolve(true); };
      image.onerror = function () { resolve(false); };
      image.src = getPermitUrl(sku) + "?v=1";
    });
    permitAvailabilityCache.set(sku, promise);
    return promise;
  }

  function createPermitButton(sku, type) {
    const isEn = isEnglish();
    const link = document.createElement("a");
    link.className = "wb-permit wb-permit-" + type;
    link.href = getPermitUrl(sku);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("data-wb-permit-sku", cleanSku(sku));
    link.setAttribute("aria-label", isEn ? "View product registration certificate" : "عرض تصريح تسجيل المنتج");
    link.innerHTML = '<span class="wb-permit-dot" aria-hidden="true"></span><span>' +
      (isEn ? "Registered Product — View Certificate" : "منتج مسجل — عرض التصريح") + "</span>";
    link.addEventListener("click", function (event) { event.stopPropagation(); });
    return link;
  }

  function addPermitToContainer(container, sku, type, insertAfter) {
    sku = cleanSku(sku);
    if (!container || !sku) return;

    const selector = '.wb-permit-' + type + '[data-wb-permit-sku="' + CSS.escape(sku) + '"]';
    if (container.querySelector && container.querySelector(selector)) return;

    permitExists(sku).then(function (exists) {
      if (!exists || !document.documentElement.contains(container === document ? document.documentElement : container)) return;
      if (container.querySelector && container.querySelector(selector)) return;

      const button = createPermitButton(sku, type);
      if (type === "page") {
        const target = insertAfter && insertAfter.nodeType === 1 ? insertAfter : getMainProductPriceTarget();
        if (target) target.insertAdjacentElement("afterend", button);
        return;
      }

      if (insertAfter && insertAfter.nodeType === 1) {
        insertAfter.insertAdjacentElement("afterend", button);
      } else if (container.appendChild) {
        container.appendChild(button);
      }
    });
  }

  function addDeveloperFooter() {
    if (document.getElementById("hajexora-footer-link")) return;
    const rights = document.querySelector(".footer-rights p");
    if (!rights) return;
    const isEn = isEnglish();
    const element = document.createElement("div");
    element.id = "hajexora-footer-link";
    element.className = "text-xs text-gray-400 mt-1";
    element.innerHTML = (isEn ? "Developed by Hajexora" : "Hajexora | طور بواسطة هاجكسورا") +
      ' | <a href="https://linktr.ee/hajexora" target="_blank" rel="noreferrer noopener" class="hover:text-primary underline">' +
      (isEn ? "Contact us" : "للتواصل") + "</a>";
    rights.appendChild(element);
  }

  function injectStyles() {
    if (document.getElementById("wb-unified-styles")) return;
    const style = document.createElement("style");
    style.id = "wb-unified-styles";
    style.textContent = `
      @keyframes pulseText {
        0%,100% { transform:scale(1); color:#ff7a00; }
        50% { transform:scale(1.05); color:#ff7a00; }
      }
      @keyframes wbPermitPulse {
        0% { box-shadow:0 0 0 0 rgba(32,164,102,.34); }
        70% { box-shadow:0 0 0 6px rgba(32,164,102,0); }
        100% { box-shadow:0 0 0 0 rgba(32,164,102,0); }
      }
      .pulse-text { display:block; animation:pulseText 1.5s infinite ease-in-out; }
      .salla-product-extra-information { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; width:100%; margin:9px 0; text-align:center; }
      .salla-live-info,.salla-card-live-views { display:flex; align-items:center; justify-content:center; gap:6px; color:#ff7a00; font-size:14px; font-weight:700; line-height:1.5; }
      .salla-card-live-views { position:relative; z-index:1; pointer-events:none; margin:4px 0; }
      .salla-purchased-count,.salla-quickview-purchases { color:#ff7a00; font-size:14px; font-weight:700; text-align:center; }
      .wb-card-rating,.wb-quickview-rating { display:flex; align-items:center; justify-content:center; width:100%; margin:5px 0 7px; line-height:1; direction:ltr; }
      .wb-fixed-stars { display:inline-flex; align-items:center; gap:2px; color:#fbbf24; font-size:15px; }
      .wb-fixed-stars i { color:#fbbf24 !important; font-size:15px; }
      .wb-permit { display:inline-flex; align-items:center; justify-content:center; gap:6px; box-sizing:border-box; padding:7px 11px; color:#19764c!important; background:#f1fbf6; border:1px solid #bfe8d1; border-radius:999px; font-weight:700; line-height:1.35; text-decoration:none!important; box-shadow:0 3px 10px rgba(25,118,76,.08); position:relative; z-index:2; pointer-events:auto; }
      .wb-permit-dot { display:inline-block; width:7px; height:7px; min-width:7px; background:#20a466; border-radius:50%; animation:wbPermitPulse 2.4s ease-out infinite; }
      .wb-permit-card { width:auto; max-width:100%; margin:5px auto 7px; font-size:10px; padding:5px 9px; }
      .wb-permit-page { margin:10px auto; font-size:13px; padding:8px 13px; }
      .wb-permit-quickview { display:flex; width:fit-content; max-width:100%; margin:8px auto 10px; font-size:12px; padding:7px 11px; }
      @media(max-width:480px){
        .salla-live-info,.salla-card-live-views,.salla-purchased-count,.salla-quickview-purchases{font-size:13px}
        .wb-fixed-stars,.wb-fixed-stars i{font-size:13px}
        .wb-permit-card{font-size:9px;padding:5px 7px;gap:4px}
        .wb-permit-page,.wb-permit-quickview{font-size:12px}
      }
      @media(prefers-reduced-motion:reduce){.pulse-text,.wb-permit-dot{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function captureQuickViewProduct(event) {
    const trigger = event.target.closest('.quickview-btn,[aria-label="Quick view"],salla-button[data-product-id],button[data-product-id]');
    if (!trigger) return;
    let id = trigger.getAttribute("data-product-id") || trigger.getAttribute("product-id") || "";
    if (!id) {
      const card = trigger.closest("custom-salla-product-card");
      if (card) id = getElementProductId(card);
    }
    if (id) lastQuickViewProductId = String(id).trim();
    [100, 300, 700, 1200].forEach(function (delay) {
      setTimeout(function () { processQuickViews(isEnglish()); }, delay);
    });
  }

  function runAll() {
    const isEn = isEnglish();
    processProductCards(isEn);
    processMainProductPage(isEn);
    processQuickViews(isEn);
    addDeveloperFooter();
  }

  function start() {
    injectStyles();
    document.addEventListener("click", captureQuickViewProduct, true);
    runAll();
    setInterval(runAll, CONFIG.liveViewsRefreshMs);

    const observer = new MutationObserver(function (mutations) {
      let added = false;
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
          added = true;
          break;
        }
      }
      if (!added) return;
      clearTimeout(observerTimer);
      observerTimer = setTimeout(runAll, CONFIG.observerDelayMs);
    });

    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

//false disapears
(function () {
  'use strict';

  var frame = 0;
  var maxFrames = 1200;

  function fixLandingFooter() {
    var components = document.querySelectorAll(
      '[component-name="landing-footer"]'
    );

    components.forEach(function (component) {
      var root = component.shadowRoot;

      if (!root) {
        var template = component.querySelector(
          'template[shadowrootmode="open"]'
        );

        if (template && template.content) {
          removeFalse(template.content);
        }

        return;
      }

      removeFalse(root);
    });

    frame++;

    if (frame < maxFrames) {
      requestAnimationFrame(fixLandingFooter);
    }
  }

  function removeFalse(root) {
    var info = root.querySelector(
      '.s-block-trust-landing-footer__info'
    );

    if (!info) return;

    Array.from(info.childNodes).forEach(function (node) {
      if (
        node.nodeType === 3 &&
        node.nodeValue &&
        node.nodeValue.trim().toLowerCase() === 'false'
      ) {
        node.nodeValue = '';
      }
    });

    if (!root.querySelector('#wb-hide-footer-false')) {
      var style = document.createElement('style');

      style.id = 'wb-hide-footer-false';
      style.textContent =
        '.s-block-trust-landing-footer__info{' +
          'font-size:0!important;' +
        '}' +
        '.s-block-trust-landing-footer__info--item,' +
        '.s-block-trust-landing-footer__info--item *{' +
          'font-size:14px!important;' +
        '}';

      root.appendChild(style);
    }
  }

  fixLandingFooter();
})();

//منصة الاعمال الرقم
(function () {
  'use strict';

  var CERTIFICATE_NUMBER = '0000293931';
  var CERTIFICATE_URL =
    'https://eauthenticate.saudibusiness.gov.sa/certificate-details/' +
    CERTIFICATE_NUMBER;

  var updateTimer = null;

  function isEnglish() {
    var html = document.documentElement;
    var lang = (html.getAttribute('lang') || '').toLowerCase();
    var pathname = location.pathname.toLowerCase();
    var search = location.search.toLowerCase();

    return (
      lang.indexOf('en') === 0 ||
      pathname === '/en' ||
      pathname.indexOf('/en/') === 0 ||
      search.indexOf('lang=en') !== -1 ||
      search.indexOf('locale=en') !== -1
    );
  }

  function getMessages() {
    if (isEnglish()) {
      return {
        number: 'Certificate No.: ' + CERTIFICATE_NUMBER,
        copy: 'Click to copy the number',
        copied: 'Number copied ✓'
      };
    }

    return {
      number: 'رقم الشهادة: ' + CERTIFICATE_NUMBER,
      copy: 'اضغط لنسخ الرقم',
      copied: 'تم نسخ الرقم ✓'
    };
  }

  function addCertificateNumber() {
    var link = document.querySelector(
      'a[data-selia="footer-sbc-link"]'
    );

    if (!link) return;

    var container = link.querySelector('.sbc-certificate-number');

    if (!container) {
      container = document.createElement('span');
      container.className = 'sbc-certificate-number';

      container.innerHTML =
        '<strong class="sbc-number-text"></strong>' +
        '<small class="sbc-copy-message"></small>';

      container.style.cssText =
        'display:flex!important;' +
        'flex-direction:column!important;' +
        'align-items:center!important;' +
        'justify-content:center!important;' +
        'margin-top:6px!important;' +
        'font-family:inherit!important;' +
        'text-align:center!important;' +
        'cursor:pointer!important;' +
        'direction:inherit!important;';

      var numberText = container.querySelector('.sbc-number-text');
      var copyMessage = container.querySelector('.sbc-copy-message');

      numberText.style.cssText =
        'display:block!important;' +
        'font-size:13px!important;' +
        'font-weight:700!important;' +
        'line-height:1.5!important;' +
        'color:inherit!important;';

      copyMessage.style.cssText =
        'display:block!important;' +
        'margin-top:2px!important;' +
        'font-size:11px!important;' +
        'font-weight:400!important;' +
        'line-height:1.5!important;' +
        'color:inherit!important;' +
        'opacity:.8!important;';

      container.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        copyCertificateNumber(container);
      });

      link.appendChild(container);
    }

    updateCertificateLanguage(container);
  }

  function updateCertificateLanguage(container) {
    if (!container) {
      container = document.querySelector(
        'a[data-selia="footer-sbc-link"] .sbc-certificate-number'
      );
    }

    if (!container) return;

    var messages = getMessages();
    var numberText = container.querySelector('.sbc-number-text');
    var copyMessage = container.querySelector('.sbc-copy-message');

    container.setAttribute('lang', isEnglish() ? 'en' : 'ar');
    container.setAttribute('dir', isEnglish() ? 'ltr' : 'rtl');

    if (numberText && numberText.textContent !== messages.number) {
      numberText.textContent = messages.number;
    }

    if (
      copyMessage &&
      container.getAttribute('data-copying') !== 'true' &&
      copyMessage.textContent !== messages.copy
    ) {
      copyMessage.textContent = messages.copy;
    }
  }

  function copyCertificateNumber(container) {
    if (
      navigator.clipboard &&
      navigator.clipboard.writeText &&
      window.isSecureContext
    ) {
      navigator.clipboard.writeText(CERTIFICATE_NUMBER).then(
        function () {
          showCopiedMessage(container);
        },
        function () {
          fallbackCopy(container);
        }
      );
    } else {
      fallbackCopy(container);
    }
  }

  function fallbackCopy(container) {
    var textarea = document.createElement('textarea');

    textarea.value = CERTIFICATE_NUMBER;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText =
      'position:fixed;left:-9999px;top:0;opacity:0;';

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      document.execCommand('copy');
    } catch (error) {}

    textarea.remove();
    showCopiedMessage(container);
  }

  function showCopiedMessage(container) {
    var copyMessage = container.querySelector('.sbc-copy-message');

    container.setAttribute('data-copying', 'true');

    if (copyMessage) {
      copyMessage.textContent = getMessages().copied;
    }

    setTimeout(function () {
      window.open(CERTIFICATE_URL, '_blank', 'noopener');

      container.removeAttribute('data-copying');
      updateCertificateLanguage(container);
    }, 700);
  }

  function scheduleUpdate() {
    clearTimeout(updateTimer);

    updateTimer = setTimeout(function () {
      addCertificateNumber();
    }, 100);
  }

  function start() {
    addCertificateNumber();

    /*
     * يراقب ظهور الفوتر وتغيير لغة المتجر،
     * من دون تعديل زر اللغة أو تعطيل عمله.
     */
    var observer = new MutationObserver(scheduleUpdate);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['lang', 'dir']
    });

    window.addEventListener('popstate', scheduleUpdate);

    document.addEventListener('click', function () {
      setTimeout(scheduleUpdate, 300);
      setTimeout(scheduleUpdate, 1000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();
