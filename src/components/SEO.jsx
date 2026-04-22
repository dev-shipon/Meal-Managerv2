import React, { useEffect } from 'react';

/**
 * SEO component to manage dynamic meta tags and title
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} props.canonical - Canonical URL
 * @param {string} props.ogTitle - Open Graph title
 * @param {string} props.ogDescription - Open Graph description
 */
export default function SEO({ 
  title, 
  description, 
  canonical, 
  ogTitle, 
  ogDescription 
}) {
  useEffect(() => {
    // Update Document Title
    if (title) {
      document.title = title.includes('Meal Manager') ? title : `${title} | Meal Manager`;
    }

    // Update Meta Description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description || 'Manage your mess and hostel meals digitally with Meal Manager. The best app for meal tracking in Bangladesh.');
    }

    // Update Canonical Tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical || window.location.href);

    // Update Open Graph Tags
    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) {
      ogTitleTag.setAttribute('content', ogTitle || title);
    }

    const ogDescriptionTag = document.querySelector('meta[property="og:description"]');
    if (ogDescriptionTag) {
      ogDescriptionTag.setAttribute('content', ogDescription || description);
    }

    // Update OG URL
    const ogUrlTag = document.querySelector('meta[property="og:url"]');
    if (ogUrlTag) {
      ogUrlTag.setAttribute('content', window.location.href);
    }
  }, [title, description, canonical, ogTitle, ogDescription]);

  return null;
}
