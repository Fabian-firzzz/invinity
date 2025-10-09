document.addEventListener('DOMContentLoaded', () => {
    // --- Loading Animation ---
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Hide loading overlay after content is loaded
    window.addEventListener('load', () => {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500); // Wait for fade out animation
        }
    });

    // --- Animasi On Scroll ---
    const scrollElements = document.querySelectorAll('.scroll-animation');

    const elementInView = (el, dividend = 1) => {
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <=
            (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('visible');
    };

    // This version typically doesn't hide on scroll up, as it can be jarring
    // const hideScrollElement = (element) => {
    //     element.classList.remove('visible');
    // };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) { // Adjust dividend for earlier/later trigger
                displayScrollElement(el);
            }
            // Optional: uncomment below if you want elements to disappear when scrolled out of view upwards
            // else {
            //     hideScrollElement(el);
            // }
        });
    };

    // Run on initial load and on scroll
    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });

    // Initial check for elements already in view when the page loads
    handleScrollAnimation();
});