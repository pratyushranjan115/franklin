import { fetchPlaceholders } from '../../scripts/aem.js';
import utility from '../../utility/utility.js';

export default async function decorate(block) {
  const [
    titleEl,
    exShowroomLabelEl,
    lakhLabelEl,
    taglineEl,
    filterSelectEl,
    carModelPathEl,
    primaryTextEl,
    primaryLinkEl,
    primaryTargetEl,
    secondaryTextEl,
    secondaryLinkEl,
    secondaryTargetEl,
    termsAndConditionsTextEl,
  ] = block.children;
  const title = titleEl?.querySelector(':is(h1,h2,h3,h4,h5,h6)');
  title.removeAttribute('id');
  title.classList.add('vehicle-name');
  const exShowroomLabel = exShowroomLabelEl?.textContent?.trim();
  const lakhLabel = lakhLabelEl?.textContent?.trim();
  const filterList = filterSelectEl?.textContent?.trim();
  const tagline = taglineEl?.textContent?.trim();
  const carModelPath = carModelPathEl.querySelector('a')?.textContent?.trim();
  const termsAndConditionsText = termsAndConditionsTextEl?.textContent?.trim() || '';

  const primaryCtaText = primaryTextEl?.textContent?.trim() || '';
  const primaryLink = primaryLinkEl?.querySelector('.button-container a')?.href;
  const primaryTarget = primaryTargetEl?.textContent?.trim() || '_self';

  const secondaryCtaText = secondaryTextEl?.textContent?.trim() || '';
  const secondaryLink = secondaryLinkEl?.querySelector('.button-container a')?.href;
  const secondaryTarget = secondaryTargetEl?.textContent?.trim() || '_self';

  const { publishDomain, apiKey } = await fetchPlaceholders();

  const tokenUrl = 'https://publish-p135331-e1341966.adobeaemcloud.com/content/nexa/services/token';
  let authorization;
  try {
    const auth = await fetch(tokenUrl);
    authorization = await auth.text();
  } catch (e) {
    authorization = '';
  }
  const storedVariantPrices = {};
  function getLocalStorage(key) {
    return localStorage.getItem(key);
  }
  async function fetchPrice(variantCode, defaultPrice) {
    const forCode = '48';
    const storedPrices = getLocalStorage('variantPrice') ? JSON.parse(getLocalStorage('variantPrice')) : {};
    if (storedPrices[variantCode] && storedPrices[variantCode].price[forCode]) {
      const storedPrice = storedPrices[variantCode].price[forCode];
      return storedPrice;
    }
    // Perform fetch only if price not already in localStorage
    const apiUrl = `https://api.preprod.developersatmarutisuzuki.in/pricing/v2/common/pricing/ex-showroom-detail?forCode=${forCode}&variantCodes=${variantCode}&variantInfoRequired=true`;

    const defaultHeaders = {
      'x-api-key': apiKey,
      Authorization: authorization,
    };
    const url = new URL(apiUrl);
    let priceData;
    try {
      const response = await fetch(url, { method: 'GET', headers: defaultHeaders });
      priceData = await response.json();
    } catch (error) {
      priceData = {};
    }
    if (priceData?.error === false && priceData?.data) {
      let formattedPrice = null;
      const timestamp = new Date().getTime() + (1 * 24 * 60 * 60 * 1000); // 1 day from now
      priceData.data?.models.forEach((variantList) => {
        const objWithNM = variantList?.exShowroomDetailResponseDTOList.find((obj) => obj.colorType === 'NM');
        if (objWithNM) {
          formattedPrice = utility.formatToLakhs(objWithNM.exShowroomPrice);
          storedVariantPrices[objWithNM.variantCd] = {
            price: {
              [forCode]: formattedPrice,
            },
            timestamp,
          };
        } else {
          const objWithM = variantList.exShowroomDetailResponseDTOList.find((obj) => obj.colorType === 'M');
          formattedPrice = utility.formatToLakhs(objWithM.exShowroomPrice);
          storedVariantPrices[objWithM.variantCd] = {
            price: {
              [forCode]: formattedPrice,
            },
            timestamp,
          };
        }
      });

      // Convert to JSON and store in localStorage
      localStorage.setItem('variantPrice', JSON.stringify(storedVariantPrices));
      return storedVariantPrices[variantCode].price[forCode];
    }
    const formattedPrice = defaultPrice ? utility.formatToLakhs(defaultPrice) : 'Not available';
    return formattedPrice;
  }

  function initCarousel() {
    const slides = block.querySelectorAll('.hero-banner__slides');
    let currentSlide = 0;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        const video = slide.querySelector('video');
        if (video) {
          if (i === index) {
            video.play();
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      });
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    }

    function handleOverlayBehavior(slide) {
      const video = slide.querySelector('video');
      const overlay = slide.querySelector('.hero__information-overlay');

      if (video && overlay) {
        let overlayShown = false;

        video.addEventListener('timeupdate', () => {
          const progress = (video.currentTime / video.duration) * 100;

          if (progress >= 50 && !overlayShown) {
            overlayShown = true;
            video.pause();
            overlay.style.opacity = '1';

            setTimeout(() => {
              overlay.style.opacity = '0';
              setTimeout(() => {
                video.play();
              }, 1000); // Wait for overlay fade-out before resuming video
            }, 3000);
          }
        });

        video.addEventListener('ended', () => {
          overlayShown = false; // Reset for next play
        });
      }
    }

    function setupVideo(video, slide) {
      video.addEventListener('loadedmetadata', () => {
      });

      video.addEventListener('ended', () => {
        nextSlide();
      });

      handleOverlayBehavior(slide);
    }

    slides.forEach((slide) => {
      const video = slide.querySelector('video');
      if (video) {
        setupVideo(video, slide);
      }
    });

    // Initialize the first slide
    showSlide(currentSlide);
  }

  const filterTypes = filterList.split(',');

  const getVideoHtml = (videoUrl) => `
  <div class="hero__video-container">
    <video src="${videoUrl}" muted="muted" width="100%" autoplay></video>
  </div>
`;

  const getAssetHtml = (videoUrl) => {
    if (videoUrl) {
      return getVideoHtml(videoUrl);
    }
    return '';
  };

  const getTypesHtml = (variant) => {
    let typeHtml = '';
    filterTypes.forEach((type, index) => {
      const typeLabel = `${type}Label`;
      const typeValue = `${type}Value`;
      typeHtml
        += `<div class="legend-item">
        <p class="legend-title">${variant[`${typeValue}`]}</p>
        <p class="legend-desc">${variant[`${typeLabel}`]}</p>
      </div>
    ${index === filterTypes.length - 1 ? '' : '<div role="separator"></div>'}`;
    });
    return typeHtml;
  };

  const getVariantHtml = async (variant) => {
    const assetHtml = window.matchMedia('(min-width: 999px)').matches ? getAssetHtml(variant.variantVideo._publishUrl) : getAssetHtml(variant.variantMobileVideo._publishUrl);
    return `
        ${assetHtml}
        <div class="hero__information-overlay" style="opacity: 0; transition: opacity 0.5s;">
          <div class="hero__top-container">
            <div class="hero__top-left">
              ${(title) ? `${title.outerHTML}` : ''}
              <h3 class="vehicle-tagline">${tagline}</h3>
            </div>
            <div class="hero__top-right">
              <div class="price-details">
                  <p class="ex-showroom-label">${exShowroomLabel}</p>
                  <div role="separator"></div>
                  <p class="ex-showroom-price">${await fetchPrice(variant.variantId, variant.exShowroomPrice)} ${lakhLabel}</p>
              </div>
              <div class="hero__ctas">
                  <div class="cta cta__primary">
                      <a href="${primaryLink}" target="${primaryTarget}">${primaryCtaText}</a>
                  </div>
                  <div class="cta cta__secondary">
                      <a href="${secondaryLink}" target="${secondaryTarget}">${secondaryCtaText}</a>
                  </div>
              </div>
            </div>
          </div>
          <div class="hero__bottom-container">
            <div class="hero__legends-container">
                <div class="hero__legends">
                  ${getTypesHtml(variant)}
                </div>
            </div>
            <div class="hero__disclaimer-container">
              <p>${variant.variantName} ${termsAndConditionsText}</p>
            </div>
          </div>
        </div>
        `;
  };

  const graphQlEndpoint = `${publishDomain}/graphql/execute.json/msil-platform/VariantList;modelId=${carModelPath}?k`;

  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const response = await fetch(graphQlEndpoint, requestOptions);
  const { data } = await response.json();
  const cars = data?.variantList?.items;
  const div = document.createElement('div');
  div.className = 'hero-banner__carousel';
  async function finalBlock() {
    for (let i = 0; i < cars.length; i += 1) {
      const html = await getVariantHtml(cars[i]);
      const item = document.createElement('div');
      item.classList.add('hero-banner__slides');
      if (i === 0) {
        item.classList.add('active');
      }
      item.innerHTML = html;
      div.insertAdjacentElement('beforeend', item);
      // if (i === cars.length - 1) {
      //   console.log(div.cloneNode(true), '[[[[[[');
      // }
    }
    initCarousel(div);
  }
  block.innerHTML = '';
  block.append(div);
  finalBlock();
}
