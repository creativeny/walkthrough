const tourColors = {
        tooltipBackground: properties.tbg, tooltipBorder: properties.tbd,
        titleText: properties.ttxt, bodyText: properties.btxt,
        buttonBackground: properties.btnbg, buttonText: properties.btntxt,
        buttonBorder: properties.btnbd,
    };

    class OnboardingTour {
        constructor(ids, titles, bodies, colors = {}) {
            this.steps = ids.split(',,').map((id, i) => {
                const [body, imageUrl] = this.parseBodyAndImage(bodies.split(',,')[i]);
                return { id: id.trim(), title: titles.split(',,')[i].trim(), body: body.trim(), imageUrl };
            });
            this.totalSteps = this.steps.length;
            this.currentStepIndex = 0;
            this.colors = { ...tourColors, ...colors };
            this.addStyles();
            this.resizeObserver = new ResizeObserver(() => this.updatePositions());
        }

        parseBodyAndImage(bodyText) {
            const parts = bodyText.split('https://');
            if (parts.length > 1) {
                const imageUrl = 'https://' + parts.pop().trim();
                return [parts.join('https://').trim(), `<br><br><img src="${imageUrl}" style="width:100%;height:auto;display:block;border-radius:8px;">`];
            }
            return [bodyText.trim(), null];
        }

        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .onboarding-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0);z-index:4998}
                .onboarding-tooltip{
                    position:fixed;
                    background-color:${this.colors.tooltipBackground};
                    border:1px solid ${this.colors.tooltipBorder};
                    border-radius:6px;
                    padding:16px;
                    box-shadow:0 4px 6px rgba(0,0,0,0.1);
                    z-index:5000;
                    width:250px;
                    font-family:Arial,sans-serif;
                    opacity:0;
                    visibility:hidden;
                    transition:opacity 0.5s ease,visibility 0.5s ease;
                }
                .onboarding-tooltip-arrow{position:absolute;width:0;height:0;border:solid 10px;}
                .onboarding-tooltip-arrow.left{border-color:transparent ${this.colors.tooltipBackground} transparent transparent;left:-20px}
                .onboarding-tooltip-arrow.right{border-color:transparent transparent transparent ${this.colors.tooltipBackground};right:-20px}
                .onboarding-tooltip-arrow.top{border-color:transparent transparent ${this.colors.tooltipBackground} transparent;top:-20px}
                .onboarding-tooltip-arrow.bottom{border-color:${this.colors.tooltipBackground} transparent transparent transparent;bottom:-20px}
                .onboarding-tooltip h3{margin:0 0 8px;font-size:16px;font-weight:600;color:${this.colors.titleText}}
                .onboarding-tooltip p{margin:0 0 16px;font-size:14px;color:${this.colors.bodyText};line-height:1.5}
                .onboarding-tooltip .btn{background-color:${this.colors.buttonBackground};color:${this.colors.buttonText};border:1px solid ${this.colors.buttonBorder};padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;margin-left:8px}
                .onboarding-tooltip .btn:first-child{margin-left:0}
                .onboarding-tooltip .close-btn{position:absolute;top:8px;right:8px;cursor:pointer;font-size:18px;color:#999}
                .onboarding-tooltip .footer{display:flex;justify-content:space-between;align-items:center}
                .onboarding-tooltip .step-counter{font-size:12px;color:#999}
                .tour-spotlight{
                    position:fixed;
                    border-radius:8px;
                    box-shadow:0 0 0 4000px rgba(0,0,0,0.4);
                    z-index:4999;
                    pointer-events:none;
                    opacity:0;
                    transition:opacity 0.5s ease;
                }
                body.tour-active{overflow:hidden;}
            `;
            document.head.appendChild(style);
        }

        createTooltipElement(step) {
            const tooltip = document.createElement('div');
            tooltip.className = 'onboarding-tooltip';
            tooltip.innerHTML = `
                <div class="onboarding-tooltip-arrow"></div>
                <h3>${step.title}</h3>
                <p>${step.body}${step.imageUrl || ''}</p>
                <div class="footer">
                    <div class="step-counter">Step ${this.currentStepIndex + 1} of ${this.totalSteps}</div>
                    <div>
                        ${this.currentStepIndex > 0 ? '<button class="btn prev-btn">Previous</button>' : ''}
                        <button class="btn next-btn">${this.currentStepIndex === this.totalSteps - 1 ? 'Finish' : 'Next'}</button>
                    </div>
                </div>
                <span class="close-btn">×</span>
            `;
            tooltip.querySelector('.next-btn').addEventListener('click', () => this.nextStep());
            tooltip.querySelector('.prev-btn')?.addEventListener('click', () => this.previousStep());
            tooltip.querySelector('.close-btn').addEventListener('click', () => this.close());
            return tooltip;
        }

        start() {
            this.overlay = document.createElement('div');
            this.overlay.className = 'onboarding-overlay';
            document.body.appendChild(this.overlay);
            this.disableScroll();
            this.showStep();
        }

        async showStep() {
            const step = this.steps[this.currentStepIndex];
            const targetElement = document.getElementById(step.id);
            if (!targetElement) {
                console.error(`Target element with id "${step.id}" not found.`);
                return;
            }

            // Hide tooltip and spotlight before scrolling
            if (this.tooltip) {
                this.tooltip.style.opacity = '0';
                this.tooltip.style.visibility = 'hidden';
            }
            if (this.spotlight) {
                this.spotlight.style.opacity = '0';
            }

            await this.scrollToElement(targetElement);

            // Use setTimeout to ensure the scroll has completed
            setTimeout(() => {
                if (!this.tooltip) {
                    this.tooltip = this.createTooltipElement(step);
                    document.body.appendChild(this.tooltip);
                    this.resizeObserver.observe(this.tooltip);
                } else {
                    this.updateTooltipContent(step);
                }

                this.createSpotlight(targetElement);
                this.updatePositions();

                // Show tooltip and spotlight after positioning
                requestAnimationFrame(() => {
                    this.tooltip.style.opacity = '1';
                    this.tooltip.style.visibility = 'visible';
                    if (this.spotlight) {
                        this.spotlight.style.opacity = '1';
                    }
                });
            }, 100);
        }

        scrollToElement(element) {
            return new Promise((resolve) => {
                const rect = element.getBoundingClientRect();
                const isInViewport = (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );

                if (!isInViewport) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                    setTimeout(resolve, 500); // Wait for scroll to complete
                } else {
                    resolve();
                }
            });
        }

        updateTooltipContent(step) {
            const tooltip = this.tooltip;
            tooltip.querySelector('h3').textContent = step.title;
            tooltip.querySelector('p').innerHTML = `${step.body}${step.imageUrl || ''}`;
            tooltip.querySelector('.step-counter').textContent = `Step ${this.currentStepIndex + 1} of ${this.totalSteps}`;
            tooltip.querySelector('.next-btn').textContent = this.currentStepIndex === this.totalSteps - 1 ? 'Finish' : 'Next';
            const prevBtn = tooltip.querySelector('.prev-btn');
            if (this.currentStepIndex > 0 && !prevBtn) {
                const newPrevBtn = document.createElement('button');
                newPrevBtn.className = 'btn prev-btn';
                newPrevBtn.textContent = 'Previous';
                newPrevBtn.addEventListener('click', () => this.previousStep());
                tooltip.querySelector('.footer > div:last-child').insertBefore(newPrevBtn, tooltip.querySelector('.next-btn'));
            } else if (this.currentStepIndex === 0 && prevBtn) {
                prevBtn.remove();
            }
        }

        updatePositions() {
            if (!this.tooltip) return;
            const step = this.steps[this.currentStepIndex];
            const targetElement = document.getElementById(step.id);
            if (!targetElement) return;

            const targetRect = targetElement.getBoundingClientRect();
            const tooltipRect = this.tooltip.getBoundingClientRect();
            const [windowWidth, windowHeight] = [window.innerWidth, window.innerHeight];
            const [margin, gap] = [16, 20];

            let [top, left, arrowClass] = [0, 0, ''];

            // Check if there's more space above or below the target element
            const spaceAbove = targetRect.top;
            const spaceBelow = windowHeight - targetRect.bottom;

            if (targetRect.left > tooltipRect.width + gap + margin) {
                left = targetRect.left - tooltipRect.width - gap;
                arrowClass = 'right';
                top = Math.max(margin, Math.min(targetRect.top, windowHeight - tooltipRect.height - margin));
            } else if (windowWidth - targetRect.right > tooltipRect.width + gap + margin) {
                left = targetRect.right + gap;
                arrowClass = 'left';
                top = Math.max(margin, Math.min(targetRect.top, windowHeight - tooltipRect.height - margin));
            } else if (spaceAbove > spaceBelow && spaceAbove > tooltipRect.height + gap + margin) {
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                arrowClass = 'bottom';
            } else if (spaceBelow > tooltipRect.height + gap + margin) {
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
                arrowClass = 'top';
            } else {
                // If there's not enough space above or below, position it to the side with most space
                if (targetRect.left > windowWidth - targetRect.right) {
                    left = Math.max(margin, targetRect.left - tooltipRect.width - gap);
                    arrowClass = 'right';
                } else {
                    left = Math.min(windowWidth - tooltipRect.width - margin, targetRect.right + gap);
                    arrowClass = 'left';
                }
                top = Math.max(margin, Math.min(targetRect.top, windowHeight - tooltipRect.height - margin));
            }

            // Ensure the tooltip stays within the viewport
            left = Math.max(margin, Math.min(left, windowWidth - tooltipRect.width - margin));

            Object.assign(this.tooltip.style, { 
                top: `${top}px`, 
                left: `${left}px` 
            });

            const arrow = this.tooltip.querySelector('.onboarding-tooltip-arrow');
            arrow.className = `onboarding-tooltip-arrow ${arrowClass}`;

            // Adjust arrow position
            if (arrowClass === 'left' || arrowClass === 'right') {
                const arrowTop = targetRect.top - top + targetRect.height / 2 - 10;
                arrow.style.top = `${Math.max(10, Math.min(arrowTop, tooltipRect.height - 20))}px`;
                arrow.style.left = '';
            } else {
                const arrowLeft = targetRect.left - left + targetRect.width / 2 - 10;
                arrow.style.left = `${Math.max(10, Math.min(arrowLeft, tooltipRect.width - 20))}px`;
                arrow.style.top = '';
            }

            this.createSpotlight(targetElement);
        }

        createSpotlight(targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const padding = 8;

            if (!this.spotlight) {
                this.spotlight = document.createElement('div');
                this.spotlight.className = 'tour-spotlight';
                document.body.appendChild(this.spotlight);
            }

            Object.assign(this.spotlight.style, {
                left: `${rect.left - padding}px`,
                top: `${rect.top - padding}px`,
                width: `${rect.width + padding * 2}px`,
                height: `${rect.height + padding * 2}px`
            });

            this.setElementZIndex(targetElement, 5000);
        }

        setElementZIndex(element, zIndex) {
            const originalZIndex = element.style.zIndex;
            element.style.zIndex = zIndex;
            if (!this.elementZIndexMap) this.elementZIndexMap = new Map();
            this.elementZIndexMap.set(element, originalZIndex);
        }

        async nextStep() {
            this.currentStepIndex++;
            this.currentStepIndex < this.totalSteps ? await this.showStep() : this.close();
        }

        async previousStep() {
            if (this.currentStepIndex > 0) {
                this.currentStepIndex--;
                await this.showStep();
            }
        }

        close() {
            this.resizeObserver.disconnect();
            [this.tooltip, this.spotlight, this.overlay].forEach(el => el?.remove());
            if (this.elementZIndexMap) {
                this.elementZIndexMap.forEach((originalZIndex, element) => {
                    originalZIndex ? element.style.zIndex = originalZIndex : element.style.removeProperty('z-index');
                });
                this.elementZIndexMap.clear();
            }
            this.enableScroll();
        }

        disableScroll() {
            document.body.classList.add('tour-active');
            // Store the current scroll position
            this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            document.body.style.top = `-${this.scrollPosition}px`;
        }

        enableScroll() {
            document.body.classList.remove('tour-active');
            // Restore the scroll position
            document.body.style.top = '';
            window.scrollTo(0, this.scrollPosition);
        }
    }

    instance.data.start = function() {
        const { ids, titles, bodies } = properties;
        window.startOnboardingTour = () => new OnboardingTour(ids, titles, bodies, tourColors).start();
        window.startOnboardingTour();
    };
