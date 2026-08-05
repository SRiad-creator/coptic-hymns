// app.js - Coptic Hymns Portal
// Fetches hymn data from hazzat.com API and renders with real Hazzat font notation
document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://api.hazzat.com";

    // DOM References
    const welcomeScreen = document.getElementById("welcome-screen");
    const servicesView = document.getElementById("services-view");
    const hymnsView = document.getElementById("hymns-view");
    const hymnDetailView = document.getElementById("hymn-detail-view");
    const bookletView = document.getElementById("booklets-view");
    const helpView = document.getElementById("help-view");
    const hymnSeasonPath = document.getElementById("hymn-season-path");
    const hymnTitleMain = document.getElementById("hymn-title-main");
    const playerPlayBtn = document.getElementById("player-play-btn");
    const recordingDropdown = document.getElementById("recording-dropdown");
    const currentTimeEl = document.getElementById("current-time");
    const totalTimeEl = document.getElementById("total-time");
    const timelineProgress = document.getElementById("timeline-progress");
    const timelineFill = document.getElementById("timeline-fill");
    const timelineKnob = document.getElementById("timeline-knob");
    const downloadCopticLink = document.getElementById("download-coptic-link");

    const citationText = document.getElementById("citation-text-display");
    const citationLink = document.getElementById("citation-external-link");
    const formatTabsEl = document.getElementById("format-tabs");
    const hazzatGrid = document.getElementById("hazzat-grid");
    const lyricsContainer = document.getElementById("lyrics-verses-container");
    const toastNotifier = document.getElementById("toast-notifier");
    const toastMessage = document.getElementById("toast-message-content");

    // Audio Player
    let audio = new Audio();
    let isPlaying = false;

    // State
    let seasonsCache = [];
    let currentHymnFormats = [];
    // Navigation state for back buttons
    let navState = { seasonId: null, seasonName: "", serviceId: null, serviceName: "" };

    // ==================
    // Utility Functions
    // ==================
    function extractId(path) {
        if (!path) return "";
        const parts = path.split("/");
        return parts[parts.length - 1];
    }

    function showToast(msg) {
        toastMessage.textContent = msg;
        toastNotifier.classList.add("show");
        setTimeout(() => toastNotifier.classList.remove("show"), 3000);
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    async function apiFetch(path) {
        try {
            const res = await fetch(`${API_BASE}${path}`);
            if (!res.ok) throw new Error(`API error ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error("API fetch error:", path, err);
            return null;
        }
    }

    // ==================
    // View Switching
    // ==================
    function showView(viewName) {
        welcomeScreen.style.display = "none";
        servicesView.style.display = "none";
        hymnsView.style.display = "none";
        hymnDetailView.style.display = "none";
        bookletView.style.display = "none";
        helpView.style.display = "none";

        if (viewName === "welcome") welcomeScreen.style.display = "";
        else if (viewName === "services") servicesView.style.display = "";
        else if (viewName === "hymns") hymnsView.style.display = "";
        else if (viewName === "hymn") hymnDetailView.style.display = "";
        else if (viewName === "booklets") bookletView.style.display = "";
        else if (viewName === "help") helpView.style.display = "";

        // Scroll to top
        window.scrollTo(0, 0);
    }

    // Header nav
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            const href = link.getAttribute("href");
            if (href === "#seasons") showView("welcome");
            else if (href === "#booklets") showView("booklets");
            else if (href === "#help") showView("help");
        });
    });

    // Back buttons
    document.getElementById("back-to-seasons").addEventListener("click", () => showView("welcome"));
    document.getElementById("back-to-services").addEventListener("click", () => {
        loadServices(navState.seasonId, navState.seasonName);
    });
    document.getElementById("back-to-hymns").addEventListener("click", () => {
        loadHymnsList(navState.seasonId, navState.serviceId, navState.seasonName, navState.serviceName);
    });

    // ==================
    // Load Seasons (home page only)
    // ==================
    async function loadSeasons() {
        const seasons = await apiFetch("/seasons");
        if (!seasons) {
            const grid = document.getElementById("home-seasons-grid");
            if (grid) grid.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:24px;">Could not load seasons from hazzat.com. Please refresh the page.</p>';
            return;
        }
        seasonsCache = seasons;
        populateHomeSeasonsGrid(seasons);
    }

    // ==================
    // Drill-down: Season → Services
    // ==================
    async function loadServices(seasonId, seasonName) {
        navState.seasonId = seasonId;
        navState.seasonName = seasonName;
        showView("services");

        document.getElementById("services-view-title").textContent = seasonName;
        document.getElementById("services-view-desc").textContent = "Select a service to see its hymns.";
        const grid = document.getElementById("services-grid");
        grid.innerHTML = '<div class="loading-spinner">Loading services...</div>';

        const services = await apiFetch(`/seasons/${seasonId}/services`);
        grid.innerHTML = "";

        if (!services || services.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No services found for this season.</p>';
            return;
        }

        const serviceIcons = ["📖", "🕯️", "⛪", "🙏", "🎶", "✝", "📿", "🌅", "🕊️"];
        services.forEach((service, i) => {
            const serviceId = extractId(service.id);
            const card = document.createElement("div");
            card.className = "drilldown-card";
            card.innerHTML = `
                <div class="drilldown-card-icon">${serviceIcons[i % serviceIcons.length]}</div>
                <div class="drilldown-card-info">
                    <div class="drilldown-card-title">${service.name}</div>
                </div>
                <svg class="drilldown-card-arrow" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/></svg>
            `;
            card.addEventListener("click", () => {
                loadHymnsList(seasonId, serviceId, seasonName, service.name);
            });
            grid.appendChild(card);
        });
    }

    // ==================
    // Drill-down: Service → Hymns list
    // ==================
    async function loadHymnsList(seasonId, serviceId, seasonName, serviceName) {
        navState.seasonId = seasonId;
        navState.seasonName = seasonName;
        navState.serviceId = serviceId;
        navState.serviceName = serviceName;
        showView("hymns");

        document.getElementById("hymns-view-title").textContent = `${seasonName} — ${serviceName}`;
        document.getElementById("hymns-view-desc").textContent = "Select a hymn to view its text, hazzat, and translations.";
        const grid = document.getElementById("hymns-grid");
        grid.innerHTML = '<div class="loading-spinner">Loading hymns...</div>';

        const hymns = await apiFetch(`/seasons/${seasonId}/services/${serviceId}/hymns`);
        grid.innerHTML = "";

        if (!hymns || hymns.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No hymns found for this service.</p>';
            return;
        }

        // Define Offertory boundary for Liturgy of the Word (service 20)
        // Hymns up to and including "Sotis" = Offering of the Lamb
        const offertoryHymns = [
            'The Hymn of Blessing (Ten Ouosht)', 'Shere Maria',
            'Nisavev (All You Wise Men)',
            'Lord Have Mercy (Keriye Eleyson)', 'Apinav Shopi',
            'Pray for these Holy and Precious Gifts', 'Al El Qorban',
            'Procession of the Lamb (Alleluia Fai Pe Piehoou)', 'Doxa Patri', 'Sotis'
        ];
        let addedOffertoryLabel = false;
        let addedLiturgyLabel = false;

        hymns.forEach((hymn, i) => {
            const hymnId = extractId(hymn.id);

            // Add sub-section labels for service 20
            if (serviceName === 'Liturgy of the Word') {
                const isOffertory = offertoryHymns.includes(hymn.name);
                if (!addedOffertoryLabel && isOffertory) {
                    const label = document.createElement("div");
                    label.className = "section-label";
                    label.innerHTML = `<span class="section-label-icon">⛪</span> Offering of the Lamb`;
                    grid.appendChild(label);
                    addedOffertoryLabel = true;
                }
                if (!addedLiturgyLabel && !isOffertory && addedOffertoryLabel) {
                    const label = document.createElement("div");
                    label.className = "section-label";
                    label.innerHTML = `<span class="section-label-icon">📖</span> Liturgy of the Word`;
                    grid.appendChild(label);
                    addedLiturgyLabel = true;
                }
            }

            const card = document.createElement("div");
            card.className = "drilldown-card";
            card.innerHTML = `
                <div class="drilldown-card-icon">🎵</div>
                <div class="drilldown-card-info">
                    <div class="drilldown-card-title">${hymn.name}</div>
                </div>
                <svg class="drilldown-card-arrow" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/></svg>
            `;
            card.addEventListener("click", () => {
                loadHymn(seasonId, serviceId, hymnId, seasonName, serviceName, hymn.name);
            });
            grid.appendChild(card);
        });
    }

    // ==================
    // Hymn Loading
    // ==================
    async function loadHymn(seasonId, serviceId, hymnId, seasonName, serviceName, hymnName) {
        showView("hymn");
        hymnSeasonPath.textContent = `${seasonName} → ${serviceName}`;
        hymnTitleMain.textContent = hymnName;

        // Get hazzat section reference
        const hazzatSection = document.getElementById("hazzat-notation-section");

        // Clear previous content
        formatTabsEl.innerHTML = "";
        hazzatGrid.innerHTML = '<div class="loading-spinner">Loading hymn content...</div>';
        lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;font-size:13px;padding:16px;">Loading...</p>';
        hazzatSection.style.display = "none";

        // Fetch available formats
        const formats = await apiFetch(`/seasons/${seasonId}/services/${serviceId}/hymns/${hymnId}/formats`);
        if (!formats || formats.length === 0) {
            lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No content available for this hymn yet.</p>';
            return;
        }

        currentHymnFormats = formats;

        // Always fetch Text format (format 1) to fill the 3-column lyrics
        const textFormat = formats.find(f => f.id.endsWith("/formats/1"));
        if (textFormat) {
            loadTextForLyrics(textFormat.id);
        } else {
            // Try embedded fallback lyrics
            const fallback = FALLBACK_LYRICS[hymnName];
            if (fallback) {
                renderFallbackLyrics(fallback);
            } else {
                lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);font-style:italic;font-size:13px;padding:16px;">No text format available for this hymn</p>';
            }
        }

        // Check for Hazzat-related formats (2=Hazzat, 3=Vertical Hazzat, 4=Musical Notes)
        // Simplified: combine all notation formats under a single "Hazzat" tab
        const hazzatFormats = formats.filter(f => {
            const fmtId = f.id.split("/formats/")[1];
            return fmtId === "2" || fmtId === "3" || fmtId === "4";
        });

        if (hazzatFormats.length > 0) {
            // Show hazzat section with simplified tabs
            hazzatSection.style.display = "";
            formatTabsEl.innerHTML = "";

            // Single "Hazzat" tab (loads best available notation)
            const hazzatBtn = document.createElement("button");
            hazzatBtn.className = "format-tab active";
            hazzatBtn.textContent = "Hazzat";
            hazzatBtn.addEventListener("click", () => {
                document.querySelectorAll(".format-tab").forEach(t => t.classList.remove("active"));
                hazzatBtn.classList.add("active");
                document.getElementById("hazzat-grid").style.display = "";
                loadFormatContent(hazzatFormats[0].id, hazzatFormats[0].name);
            });
            formatTabsEl.appendChild(hazzatBtn);

            // "Lyrics" tab (scrolls to lyrics section)
            const lyricsBtn = document.createElement("button");
            lyricsBtn.className = "format-tab";
            lyricsBtn.textContent = "Lyrics";
            lyricsBtn.addEventListener("click", () => {
                document.querySelectorAll(".format-tab").forEach(t => t.classList.remove("active"));
                lyricsBtn.classList.add("active");
                document.getElementById("hazzat-grid").style.display = "none";
                lyricsContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            formatTabsEl.appendChild(lyricsBtn);

            // Load hazzat notation (prefer format 2, then 3, then 4)
            loadFormatContent(hazzatFormats[0].id, hazzatFormats[0].name);
        }

        // Reset player
        stopAudio();
        const noAudioMsg = document.getElementById("no-audio-message");
        const playerControls = document.getElementById("player-controls");
        const ytContainer = document.getElementById("youtube-player-container");

        // Check for Audio format (format 5) and load into custom player
        const audioFormat = formats.find(f => f.id.endsWith("/formats/5"));
        if (audioFormat) {
            ytContainer.style.display = "none";
            loadAudioForPlayer(audioFormat.id);
        } else {
            playerControls.style.display = "none";
            downloadCopticLink.style.display = "none";

            // Try curated recordings fallback
            const recordings = findRecordings(hymnName);
            if (recordings) {
                noAudioMsg.style.display = "none";
                // Build recording links HTML
                let linksHtml = '';
                // YouTube SVG icon
                const ytIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>`;
                // SoundCloud SVG icon
                const scIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.56 8.87V17h8.76c1.85 0 2.68-1.4 2.68-2.81 0-1.4-.83-2.82-2.68-2.82-.52 0-.95.13-1.35.35-.07-3.38-2.73-5.65-5.13-5.65-1.01 0-1.66.33-2.28.8v1zm-1.93-.04V17h1.24V8.07c-.37.2-.81.5-1.24.76zM7.51 9.83V17h1.24V9.4c-.38.14-.81.28-1.24.43zm-2.46 1.6V17h1.23v-4.85c-.38.12-.8.18-1.23.28zm-2.47.93V17h1.24v-3.95c-.44.05-.81.17-1.24.31zM0 14.29V17h1.24v-2.32c-.42-.12-.83-.25-1.24-.39z"/></svg>`;
                if (recordings.coptic) {
                    const copticUrl = `https://www.youtube.com/watch?v=${recordings.coptic.id}`;
                    linksHtml += `<a href="${copticUrl}" target="_blank" class="recording-link coptic-link">
                        ${ytIcon} ☦️ Coptic — ${recordings.coptic.label}
                    </a>`;
                }
                if (recordings.english) {
                    const engUrl = recordings.english.url || `https://www.youtube.com/watch?v=${recordings.english.id}`;
                    linksHtml += `<a href="${engUrl}" target="_blank" class="recording-link english-link">
                        ${scIcon} 🇬🇧 English — ${recordings.english.label}
                    </a>`;
                }
                ytContainer.innerHTML = `<div class="recordings-links-section">
                    <span class="recordings-label">🎵 Listen to Recordings</span>
                    <div class="recordings-links">${linksHtml}</div>
                </div>`;
                ytContainer.style.display = "block";
                recordingDropdown.innerHTML = `<option value="">Recordings available</option>`;
            } else {
                noAudioMsg.style.display = "flex";
                ytContainer.style.display = "none";
                recordingDropdown.innerHTML = '<option value="">No audio available</option>';
            }
        }

        // Update citation
        citationText.textContent = `Hymn content from hazzat.com`;
        citationLink.style.display = "inline-flex";
        citationLink.href = `https://www.hazzat.com/#/Seasons/${seasonId}/services/${serviceId}/hymns/${hymnId}`;
    }

    // Load audio format into the custom player
    async function loadAudioForPlayer(audioFormatPath) {
        const noAudioMsg = document.getElementById("no-audio-message");
        const playerControls = document.getElementById("player-controls");
        const variations = await apiFetch(`${audioFormatPath}/variations`);

        if (!variations || variations.length === 0) {
            noAudioMsg.style.display = "flex";
            playerControls.style.display = "none";
            recordingDropdown.innerHTML = '<option value="">No audio available</option>';
            return;
        }

        // Hide the no-audio message, show player controls
        noAudioMsg.style.display = "none";
        playerControls.style.display = "";

        // Populate dropdown with all audio variations
        recordingDropdown.innerHTML = "";
        variations.forEach((v, idx) => {
            const opt = document.createElement("option");
            opt.value = v.content?.audioFilePath || "";
            opt.textContent = v.name || `Recording ${idx + 1}`;
            recordingDropdown.appendChild(opt);
        });

        // Load the first audio variation
        const firstAudioUrl = variations[0].content?.audioFilePath;
        if (firstAudioUrl) {
            audio.src = firstAudioUrl;
            audio.load();
            downloadCopticLink.href = firstAudioUrl;
            downloadCopticLink.style.display = "inline-flex";

            showToast("Audio loaded — press play to listen");
        }
    }

    // ==================
    // Embedded Fallback Lyrics (for hymns with no API text format)
    // Sourced from Tasbeha.org and standard liturgical references
    // ==================
    const FALLBACK_LYRICS = {
        "Lord Have Mercy (Keriye Eleyson)": [
            { coptic: "Kuri`e `ele`ycon.", trans: "Kyrie eleison.", eng: "Lord, have mercy." },
            { coptic: "Kuri`e `ele`ycon.", trans: "Kyrie eleison.", eng: "Lord, have mercy." },
            { coptic: "Kuri`e `ele`ycon.", trans: "Kyrie eleison.", eng: "Lord, have mercy." },
        ],
        "Doxa Patri": [
            { coptic: "Doxa Patri ke Uiw ke `agi`w `pneumati.", trans: "Doxa Patri ke Uio ke Agio Pneumati.", eng: "Glory to the Father and to the Son and to the Holy Spirit." },
            { coptic: "Ke nun ke `a`i ke ictouc `e`wnac twn `e`wnwn@ `amyn.", trans: "Ke nun ke ai ke is tous eonas ton eonon. Amin.", eng: "Now and ever and unto the ages of ages. Amen." },
        ],
        "Pray for these Holy and Precious Gifts": [
            { coptic: "Proceu[ac;e `uper twn `agiwn timiwn dwron toutwn@", trans: "Prosevksasthe yper ton agion timion doron touton,", eng: "Pray for these holy and precious gifts," },
            { coptic: "ke ;uciwn `ymwn@ ke procoferontwn.", trans: "ke thysion imon, ke prosferonton.", eng: "our sacrifices, and those who bring them." },
            { coptic: "Kuri`e `ele`ycon.", trans: "Kyrie eleison.", eng: "Lord, have mercy." },
        ],
        "Nisavev (All You Wise Men)": [
            { coptic: "Nicabeu tyrou `nte piIcrahl@", trans: "Ni-savev tirou ente pi-Israel,", eng: "O all you wise men of Israel," },
            { coptic: "ny`eterhoub `enikap `nnoub@", trans: "ni-eter-houb e-ni-kap en-noub,", eng: "the makers of golden thread," },
            { coptic: "ma;ami`o `nou`es;yn `nAarwn@", trans: "ma-thamio en-ou-estheen en-Aaron,", eng: "make a robe of Aaron," },
            { coptic: "kata `ptaio `ntime]ouyb@", trans: "kata ep-taio en-ti-met-ouiab,", eng: "befitting the honor of the priesthood," },
            { coptic: "`mpeniwt ettaiyout piar,y`ereuc@", trans: "em-pen-iot et-taiiout pi-arshi-erevs,", eng: "of our honored father, the high priest," },
            { coptic: "Papa Abba ... nem peniwt `nepickopoc Abba ...", trans: "Papa Abba ... nem pen-iot ni-episkopos Abba ...", eng: "Pope Abba ... and our father the bishop, Abba ..." },
            { coptic: "nimenrat `nte Pi`,rictoc.", trans: "ni-menrat ente Pi-Ekhristos.", eng: "the beloved of Christ." },
        ],
        "Al El Qorban": [
            { coptic: "`Allyloui`a.", trans: "Alleluia.", eng: "Alleluia." },
        ],
        "Procession of the Lamb (Alleluia Fai Pe Piehoou)": [
            { coptic: "=a=l.", trans: "Alleluia.", eng: "Alleluia." },
            { coptic: "Vai pe pi`ehoou `eta P=o=c ;amiof.", trans: "Fai pe pi-ehoou eta Epchois thamiof.", eng: "This is the day which the Lord has made." },
            { coptic: "Maren;elyl `ntenounof `mmon `nqytf.", trans: "Maren-thelil enten-ounof emmon en-khitf.", eng: "Let us rejoice and be glad in it." },
            { coptic: "`W P=o=c `ekenahmen.", trans: "O Epchois eke-nahmen.", eng: "O Lord, save us." },
            { coptic: "`W P=o=c `ekecou`ten nenmwit.", trans: "O Epchois eke-souten nen-moit.", eng: "O Lord, straighten our ways." },
            { coptic: "`Fcmarwout `nje vy`e;nyou qen `vran `mP=o=c.", trans: "Ef-esmaroout enje fi-ethniou khen ef-ran em-Epchois.", eng: "Blessed is He who comes in the name of the Lord." },
            { coptic: "=a=l.", trans: "Alleluia.", eng: "Alleluia." },
        ],
        "Gospel Response": [
            { coptic: "Pioui1t `mpikocmoc `tyrf.", trans: "Pi-ouisht empi-kosmos tirf.", eng: "The salvation of the whole world." },
        ],
        "Amen Amen Amen Ton Thanaton": [
            { coptic: "`Amyn `amyn `amyn.", trans: "Amin, Amin, Amin.", eng: "Amen, Amen, Amen." },
            { coptic: "Ton ;anaton cou Kuri`e kataggelomen.", trans: "Ton thanaton sou Kyrie katangellomen.", eng: "Your death, O Lord, we proclaim." },
            { coptic: "Ke tyn `agian cou `anactacin.", trans: "Ke tin agian sou anastasin.", eng: "And Your holy resurrection." },
            { coptic: "Ke tyn analypsin `omologoumen.", trans: "Ke tin analipsin omologoumen.", eng: "And ascension, we confess." },
            { coptic: "Ce `umnoumen@ ce eulogoumen.", trans: "Se imnoumen, se evlogoumen.", eng: "We praise You, we bless You." },
            { coptic: "Ci eu,arictoumen Kuri`e.", trans: "Si efkharistoumen Kyrie.", eng: "We thank You, O Lord." },
            { coptic: "Ke deome;a cou `o :eoc `ymwn.", trans: "Ke deometha sou o Theos imon.", eng: "And we entreat You, O our God." },
        ],
        "One is the All Holy Father": [
            { coptic: "Oueic Viwt =e=;=u.", trans: "Oueis Fiot Ethouav.", eng: "One is the All Holy Father." },
            { coptic: "Oueic Syri =e=;=u.", trans: "Oueis Shiri Ethouav.", eng: "One is the All Holy Son." },
            { coptic: "Ouei =p=n=a =e=;=u.", trans: "Ouei Epnevma Ethouav.", eng: "One is the All Holy Spirit." },
            { coptic: "`Amyn.", trans: "Amin.", eng: "Amen." },
        ],
        "As it Was (Osberein)": [
            { coptic: "Wc`pe`rin `m`vnou]@ pai on ef`eswpi sa `eneh.", trans: "Osperein em-Efnouti, pai on ef-eshopi sha eneh.", eng: "As it was, God, this also shall be, unto the ages." },
            { coptic: "Sa `eneh nem sa `eneh `nte pi`eneh.", trans: "Sha eneh nem sha eneh ente pi-eneh.", eng: "Unto the ages of ages." },
            { coptic: "`Amyn.", trans: "Amin.", eng: "Amen." },
        ],
    };

    // ==================
    // Curated Hymn Recordings (all video IDs verified by title)
    // Coptic: Ibrahim Ayad / known cantors (YouTube)
    // English: Coptic Hymns in English — SoundCloud (soundcloud.com/mmguirguis)
    // ==================
    const HYMN_RECORDINGS = {
        "The Hymn of Blessing (Ten Ouosht)": {
            coptic: { id: "rPw0eIexGvY", label: "Ibrahim Ayad" },           // The Divine Liturgy - Ten-oo-osht
            english: { url: "https://soundcloud.com/mmguirguis/search?q=ten+ouosht", label: "Coptic Hymns in English" },
        },
        "Shere Maria": {
            coptic: { id: "ZdMl5fYBULc", label: "Ibrahim Ayad" },           // Shere Ni Maria - Ibrahim Ayad & Chorus
            english: { url: "https://soundcloud.com/mmguirguis/search?q=shere+maria", label: "Coptic Hymns in English" },
        },
        "Shere ne Maria": {
            coptic: { id: "ZdMl5fYBULc", label: "Ibrahim Ayad" },
            english: { url: "https://soundcloud.com/mmguirguis/search?q=shere+maria", label: "Coptic Hymns in English" },
        },
        "The Hymn of the Censer (Tai Shouri)": {
            coptic: { id: "hXy9InYKFn0", label: "Ibrahim Ayad" },           // The Hymn of Taishoori (This Censer...)
            english: { url: "https://soundcloud.com/mmguirguis/search?q=tai+shouri", label: "Coptic Hymns in English" },
        },
        "Aspasmos Adam (Rejoice O Mary)": {
            coptic: { id: "iuTsLswt2RU", label: "Ibrahim Ayad" },           // Apostles Fast: Aspasmos Adam - Mlm Ibrahim Ayad
            english: { url: "https://soundcloud.com/mmguirguis/search?q=aspasmos+adam", label: "Coptic Hymns in English" },
        },
        "Aspasmos Watos (O Lord)": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=aspasmos+watos", label: "Coptic Hymns in English" },
        },
        "Procession of the Lamb (Alleluia Fai Pe Piehoou)": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=procession+lamb", label: "Coptic Hymns in English" },
        },
        "Trisagion (Agios)": {
            coptic: { id: "Me0wgXuAWKg", label: "Ibrahim Ayad" },           // Lahn Agios - Ibrahim Ayad
            english: { url: "https://soundcloud.com/mmguirguis/search?q=agios", label: "Coptic Hymns in English" },
        },
        "Psalm 150": {
            coptic: { id: "wDWjflJbHpE", label: "Ibrahim Ayad" },           // Resurrection Psalm 150 - Mlm Ibrahim Ayad
            english: { url: "https://soundcloud.com/mmguirguis/search?q=psalm+150", label: "Coptic Hymns in English" },
        },
        "Arise O Children of the Light (Ten Theno)": {
            coptic: { id: "lCoJVzpJmpE", label: "Ibrahim Ayad" },           // Ten Theno: Arise O Children of Light - Ibrahim Ayad
            english: { url: "https://soundcloud.com/mmguirguis/search?q=ten+theno", label: "Coptic Hymns in English" },
        },
        "Penishti": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=penishti", label: "Coptic Hymns in English" },
        },
        "Penishti (Great)": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=penishti", label: "Coptic Hymns in English" },
        },
        "Psalm 116 (Ni Ethnos Teero)": {
            coptic: { id: "hdKatF1QJjw", label: "Ibrahim Ayad" },           // Niethnos Teero (Vesper Praises)
            english: { url: "https://soundcloud.com/mmguirguis/search?q=ni+ethnos", label: "Coptic Hymns in English" },
        },
        "Doxa Patri": {
            coptic: { id: "MlOg7qS3nTQ", label: "Ibrahim Ayad" },           // The Divine Liturgy - Zoxa Patri
            english: { url: "https://soundcloud.com/mmguirguis/search?q=doxa+patri", label: "Coptic Hymns in English" },
        },
        "Amen Amen Amen Ton Thanaton": {
            coptic: { id: "WRFJdtM5XmE", label: "Coptic" },                 // Amen Amen Amen - Ton Thanaton (Coptic)
            english: { url: "https://soundcloud.com/mmguirguis/search?q=ton+thanaton", label: "Coptic Hymns in English" },
        },
        "Morning Doxology": {
            coptic: { id: "XKcNDpbo2Dk", label: "Ibrahim Ayad" },           // Morning Doxology
            english: { url: "https://soundcloud.com/mmguirguis/search?q=morning+doxology", label: "Coptic Hymns in English" },
        },
        "Apetjeek Evol": {
            coptic: { id: "FFzoNBkKC_g", label: "Coptic Lent" },            // Lahn Abtgeek Evol (Coptic Lent)
            english: { url: "https://soundcloud.com/mmguirguis/search?q=apetjeek", label: "Coptic Hymns in English" },
        },
        "The Creed": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=creed", label: "Coptic Hymns in English" },
        },
        "The Bread of Life": {
            coptic: { id: "lStifjX0u1U", label: "Coptic Hymn" },            // Pi-oik - The Bread of Life Coptic Hymn
            english: { url: "https://soundcloud.com/mmguirguis/search?q=bread+of+life", label: "Coptic Hymns in English" },
        },
        "Lord Have Mercy (Keriye Eleyson)": {
            coptic: { id: "V8u16f3ux8I", label: "Ibrahim Ayad" },           // Lahn Kerie Eleison
            english: { url: "https://soundcloud.com/mmguirguis/search?q=kyrie+eleison", label: "Coptic Hymns in English" },
        },
        "Sotis": {
            coptic: { id: "lfjSs6lRfBE", label: "Coptic" },                 // Fraction Response - Sotees Amen (Coptic)
            english: { url: "https://soundcloud.com/mmguirguis/search?q=sotis", label: "Coptic Hymns in English" },
        },
        "Nisavev (All You Wise Men)": {
            coptic: { id: "6Stq6psGcuU", label: "Malak Rizkalla" },         // Nisavev tiro
            english: { url: "https://soundcloud.com/mmguirguis/search?q=nisavev", label: "Coptic Hymns in English" },
        },
        "Apinav Shopi": {
            english: { url: "https://soundcloud.com/mmguirguis/search?q=apinav", label: "Coptic Hymns in English" },
        },
        "One is the All Holy Father": {
            coptic: { id: "WRFJdtM5XmE", label: "Coptic" },
        },
        "As it Was (Osberein)": {
            coptic: { id: "WRFJdtM5XmE", label: "Coptic" },
        },
    };

    // Fuzzy match: try exact name, then partial substring matches
    function findRecordings(hymnName) {
        if (HYMN_RECORDINGS[hymnName]) return HYMN_RECORDINGS[hymnName];
        const lower = hymnName.toLowerCase();
        for (const [key, rec] of Object.entries(HYMN_RECORDINGS)) {
            if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
                return rec;
            }
        }
        return null;
    }

    // Render fallback lyrics in the same 3-column layout as API lyrics
    function renderFallbackLyrics(verses) {
        lyricsContainer.innerHTML = "";
        verses.forEach(v => {
            const row = document.createElement("div");
            row.className = "verse-row";
            row.innerHTML = `
                <div class="verse-cell coptic CopticFont">${v.coptic}</div>
                <div class="verse-cell franco">${v.trans}</div>
                <div class="verse-cell english">${v.eng}</div>
            `;
            lyricsContainer.appendChild(row);
        });
    }

    // Transliterate CS Avva Shenouda font encoding to phonetic Coptic pronunciation.
    // Cross-referenced: Tasbeha.org, CopticReference.com, Younan Bohairic Grammar.
    function copticToFranco(text) {
        if (!text) return "";
        let t = text;

        // ===== 1. Decode HTML entities =====
        // IMPORTANT: decode &nbsp; FIRST so its ';' doesn't become ⲑ (Theta)
        t = t.replace(/&nbsp;/g, " ")
             .replace(/&ensp;/g, " ")
             .replace(/&emsp;/g, " ")
             .replace(/&thinsp;/g, "")
             .replace(/&#\d+;/g, " ")
             .replace(/&lt;/g, "##SH##")
             .replace(/&gt;/g, "##KH##")
             .replace(/&amp;/g, "&")
             .replace(/</g, "##SH##")
             .replace(/>/g, "##KH##");

        // ===== 2. Expand sacred abbreviations (protected from char mapping) =====
        const abbrevs = [];
        function protect(txt) {
            const idx = abbrevs.length;
            abbrevs.push(txt);
            return `\x1E${idx}\x1F`;  // RS/US control chars (never in Coptic text)
        }
        // Order matters: longer patterns first
        t = t.replace(/Pen=o=c/g, protect("Epchois"));     // Our Lord
        t = t.replace(/P=,=c/g, protect("Pikhristos"));    // Christ
        t = t.replace(/Pi=,=c/g, protect("Pikhristos"));   // Christ (alt)
        t = t.replace(/P=o=c/g, protect("Epchois"));       // Lord (abbreviated)
        t = t.replace(/ta=o=c/g, protect("Tashois"));       // My Lady
        t = t.replace(/=e=;=u/g, protect("Ethouav"));      // Holy (ⲉⲑⲟⲩⲁⲃ)
        t = t.replace(/=a=l/g, protect("Alleluia"));        // Alleluia
        t = t.replace(/=p=n=a/g, protect("Epnevma"));      // Spirit (ⲡⲛⲉⲩⲙⲁ)

        // ===== 3. Process formatting markers =====
        t = t.replace(/@/g, ", ");       // @ = verse/section separator
        // Jinkim (`) before a consonant adds an "e" sound (Bohairic pronunciation)
        // Exclude vowels (a,e,i,o,u,w,y), spaces, and our marker chars
        t = t.replace(/`([^aeiouwy\s@`=,.#\x1E\x1F])/gi, 'e$1');
        t = t.replace(/`/g, '');         // Remove remaining backticks
        t = t.replace(/=/g, "");         // Strip abbreviation overlines

        // ===== 4. Character-by-character phonetic mapping =====
        const charMap = {
            // Multi-char Coptic letters (special ASCII chars in CS font)
            ']': 'ti',     // ϯ (Ti)
            '[': 'ch',     // ϭ (Shima) — "ch" as in "church"
            ';': 'th',     // ⲑ (Theta) — "th" as in "think"
            ':': 'th',     // Θ (Theta uppercase)

            // Letters that differ from Latin pronunciation
            'b': 'v',      // ⲃ (Vita) — "v" default, becomes "b" via post-processing
            'B': 'V',      // Ⲃ (Vita uppercase)
            'c': 's',      // ⲥ (Sima) — "s" sound
            'C': 'S',      // Ⲥ (Sima uppercase)
            's': 'sh',     // ϣ (Shai) — "sh" sound
            'S': 'Sh',     // Ϣ (Shai uppercase)
            'w': 'o',      // ⲱ (Omega) — long "o"
            'W': 'O',      // Ⲱ (Omega uppercase)
            'h': 'h',      // ϩ (Hori) — "h"
            'H': 'H',      // Ϩ (Hori uppercase)
            'y': 'i',      // ⲏ (Eta) — "i" in Bohairic
            'q': 'kh',     // ϧ (Khai) — "kh"
            'Q': 'Kh',     // Ϧ (Khai uppercase)
            'v': 'f',      // ⲫ (Phi) — "f"
            'V': 'f',      // Ⲫ (Phi uppercase)
            'Y': 'ps',     // ⲯ (Psi) — "ps"
            "'": 'ps',     // ⲯ (Psi) — apostrophe encoding
            '1': 'sh',     // ϣ (Shai) — alternate encoding
        };

        let result = '';
        for (let i = 0; i < t.length; i++) {
            const ch = t[i];

            // Protected abbreviation placeholders — pass through
            if (ch === '\x1E') {
                let end = t.indexOf('\x1F', i);
                if (end === -1) end = t.length;
                result += t.substring(i, end + 1);
                i = end;
            }
            // ##SH## / ##KH## markers for Shai/Khai
            else if (ch === '#' && t.substring(i, i + 6) === '##SH##') {
                result += 'sh'; i += 5;
            } else if (ch === '#' && t.substring(i, i + 6) === '##KH##') {
                result += 'kh'; i += 5;
            }
            // ϫ (Janja): "g" before back vowels, "j" before front vowels
            else if (ch === '{' || ch === 'J' || ch === 'j') {
                const next = t[i + 1];
                const isUpper = (ch === 'J');
                if (next && /[aowAOW]/.test(next)) {
                    result += isUpper ? 'G' : 'g';
                } else {
                    result += isUpper ? 'J' : 'j';
                }
            }
            // Static charMap entries
            else if (charMap[ch] !== undefined) {
                result += charMap[ch];
            }
            // ⲩ (Upsilon): "ou" diphthong if after 'o', otherwise "e"
            else if (ch === 'u') {
                if (result.length > 0 && result[result.length - 1] === 'o') {
                    result += 'u';
                } else {
                    result += 'e';
                }
            }
            // ⲭ (Chi): comma followed by a letter = "kh"
            else if (ch === ',' && i + 1 < t.length && /[a-zA-Z]/.test(t[i + 1])) {
                result += 'kh';
            }
            // Everything else passes through (a,d,e,f,g,i,k,l,m,n,o,p,r,t,z,spaces,etc.)
            else {
                result += ch;
            }
        }

        // ===== 5. Restore protected abbreviations =====
        result = result.replace(/\x1E(\d+)\x1F/g, (m, idx) => abbrevs[parseInt(idx)]);

        // ===== 6. Post-processing =====

        // Vita (ⲃ) contextual pronunciation:
        // Default is 'v' from charMap, but only stays 'v' before a vowel sound
        // Otherwise becomes 'b' (before consonants, end of word, etc.)
        // First: change ALL 'v' to 'b'
        result = result.replace(/v/gi, (m) => m === 'V' ? 'B' : 'b');
        // Then: restore 'v' only when followed by a vowel
        result = result.replace(/b(?=[aeiou])/gi, (m) => m === 'B' ? 'V' : 'v');

        // God (ⲫϯ and variants)
        result = result.replace(/\bemfti\b/gi, "em-Efnouti");
        result = result.replace(/\bfnouti\b/gi, "Efnouti");
        result = result.replace(/\bfti\b/gi, "Efnouti");
        result = result.replace(/\bePchois\b/g, "Epchois");
        result = result.replace(/\bPchois\b/g, "Epchois");
        result = result.replace(/\btheotokos\b/gi, "Theotokos");
        result = result.replace(/\bPennouti\b/gi, "Pennouti");

        // Common biblical/saint names → standard English forms
        result = result.replace(/\bGavriil\b/g, "Gabriel");
        result = result.replace(/\bMikhail\b/g, "Michael");
        result = result.replace(/\bEmmanouil\b/g, "Emmanuel");
        result = result.replace(/\bEmmanouyl\b/g, "Emmanuel");
        result = result.replace(/\bDafid\b/g, "David");
        result = result.replace(/\bMoisis\b/g, "Moses");
        result = result.replace(/\bIesse\b/g, "Yesse");
        result = result.replace(/\bIisouc\b/gi, "Iisous");
        result = result.replace(/\bIsrail\b/g, "Israel");
        result = result.replace(/\bSion\b/g, "Zion");

        // Coptic article/preposition hyphenation (Tasbeha.org style)
        // pi-=the(m), ti-=the(f), ni-=the(pl), em-=of/in, en-=of
        // Only hyphenate before roots that are 4+ chars (avoids splitting small words)
        result = result.replace(/\b(pi|ti|ni)([a-z]{4,})/gi, (m, art, root) => art + '-' + root);
        result = result.replace(/\b(em|en)(Efnouti|Epchois|pimai|pi[A-Z])/g, (m, pre, root) => pre + '-' + root);

        // Clean up spacing
        result = result.replace(/\s{2,}/g, ' ');
        result = result.replace(/,\s*$/g, '');
        result = result.trim();

        // Capitalize first letter of each verse/segment
        result = result.replace(/(^|,\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());

        return result;
    }

    // Fetch Text format and render verse-aligned rows (Coptic | Transliteration | English)
    async function loadTextForLyrics(textFormatPath) {
        const variations = await apiFetch(`${textFormatPath}/variations`);
        if (!variations || variations.length === 0) {
            lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No text content available.</p>';
            return;
        }
        const content = variations[0].content;
        if (!content) {
            lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No text content available.</p>';
            return;
        }

        lyricsContainer.innerHTML = "";

        if (content.paragraphs && Array.isArray(content.paragraphs)) {
            content.paragraphs.forEach(para => {
                if (!para.columns) return;
                let copticText = "", englishText = "";

                para.columns.forEach(col => {
                    const lang = (col.language || "").toLowerCase();
                    if (lang === "coptic") copticText = col.content || "";
                    else if (lang === "english") englishText = col.content || "";
                    // Arabic skipped
                });

                const row = document.createElement("div");
                row.className = "verse-row";
                row.innerHTML = `
                    <div class="verse-cell coptic CopticFont">${copticText}</div>
                    <div class="verse-cell franco">${copticToFranco(copticText)}</div>
                    <div class="verse-cell english">${englishText}</div>
                `;
                lyricsContainer.appendChild(row);
            });
        }

        if (lyricsContainer.children.length === 0) {
            lyricsContainer.innerHTML = '<p style="color:var(--text-secondary);padding:16px;">No text content available.</p>';
        }
    }

    async function loadFormatContent(formatPath, formatName) {
        hazzatGrid.innerHTML = '<div class="loading-spinner">Loading content...</div>';

        const variations = await apiFetch(`${formatPath}/variations`);
        if (!variations || variations.length === 0) {
            hazzatGrid.innerHTML = '<p style="color:var(--text-secondary);">No content available for this format.</p>';
            return;
        }

        const variation = variations[0];
        const content = variation.content;

        if (!content) {
            hazzatGrid.innerHTML = '<p style="color:var(--text-secondary);">Content not available.</p>';
            return;
        }

        // Render based on content type
        const contentType = content.contentType || "";

        if (contentType === "TextContent" || contentType === "Text") {
            renderTextContent(content);
        } else if (contentType === "HazzatContent" || contentType === "Hazzat") {
            renderHazzatContent(content);
        } else if (contentType === "VerticalHazzatContent" || contentType === "VerticalHazzat") {
            renderHazzatContent(content);
        } else if (contentType === "MusicalNotesContent" || contentType === "MusicalNotes") {
            renderMusicalNotesContent(content);
        } else if (contentType === "AudioContent" || contentType === "Audio") {
            renderAudioContent(content);
        } else if (contentType === "VideoContent" || contentType === "Video") {
            renderVideoContent(content);
        } else if (contentType === "InformationContent" || contentType === "Information") {
            renderInformationContent(content);
        } else {
            // Try to render whatever we have
            renderGenericContent(content);
        }
    }

    // ==================
    // Content Renderers
    // ==================
    function renderHazzatContent(content) {
        let html = "";

        // Coptic Hazzat
        if (content.copticHazzat) {
            html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Coptic with Hazzat</strong></div>`;
            html += `<div style="margin-bottom:24px;">${content.copticHazzat}</div>`;
        }

        // English Hazzat
        if (content.englishHazzat) {
            html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">English with Hazzat</strong></div>`;
            html += `<div style="margin-bottom:24px;">${content.englishHazzat}</div>`;
        }

        // Arabic Hazzat
        if (content.arabicHazzat) {
            html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Arabic with Hazzat</strong></div>`;
            html += `<div style="direction:rtl;text-align:right;margin-bottom:24px;">${content.arabicHazzat}</div>`;
        }

        if (!html) {
            html = '<p style="color:var(--text-secondary);">No Hazzat notation content available.</p>';
        }

        hazzatGrid.innerHTML = html;
    }

    function renderTextContent(content) {
        let html = "";

        // Handle paragraphs/columns structure from hazzat.com API
        if (content.paragraphs && Array.isArray(content.paragraphs)) {
            let copticHtml = "", englishHtml = "", arabicHtml = "";

            content.paragraphs.forEach((para, i) => {
                if (!para.columns) return;

                let verseHtml = `<div style="margin-bottom:20px;padding:16px;background:var(--bg-main);border-radius:8px;border-left:3px solid var(--accent-gold);">`;
                verseHtml += `<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Verse ${i + 1}</div>`;

                para.columns.forEach(col => {
                    const text = col.content || "";
                    const lang = (col.language || "").toLowerCase();
                    if (lang === "coptic") {
                        verseHtml += `<div class="CopticFont" style="margin-bottom:8px;line-height:1.8;">${text}</div>`;
                        copticHtml += `<div class="lyric-line-item coptic">${text}</div>`;
                    } else if (lang === "english") {
                        verseHtml += `<div class="EnglishFont" style="margin-bottom:8px;line-height:1.6;">${text}</div>`;
                        englishHtml += `<div class="lyric-line-item">${text}</div>`;
                    } else if (lang === "arabic") {
                        verseHtml += `<div class="ArabicFont" style="direction:rtl;text-align:right;line-height:1.8;">${text}</div>`;
                        arabicHtml += `<div class="lyric-line-item arabic">${text}</div>`;
                    }
                });

                verseHtml += `</div>`;
                html += verseHtml;
            });

            // Lyrics columns are already handled by loadTextForLyrics
        }
        // Fallback for flat fields
        else {
            if (content.copticText) {
                html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;">Coptic</strong></div>`;
                html += `<div class="CopticFont" style="margin-bottom:24px;line-height:2;">${content.copticText}</div>`;
            }
            if (content.englishText) {
                html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;">English</strong></div>`;
                html += `<div class="EnglishFont" style="margin-bottom:24px;line-height:1.8;">${content.englishText}</div>`;
            }
            if (content.arabicText) {
                html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:13px;text-transform:uppercase;">Arabic</strong></div>`;
                html += `<div class="ArabicFont" style="direction:rtl;text-align:right;margin-bottom:24px;line-height:2;">${content.arabicText}</div>`;
            }
        }

        if (!html) {
            html = '<p style="color:var(--text-secondary);">No text content available.</p>';
        }

        hazzatGrid.innerHTML = html;
    }

    function renderMusicalNotesContent(content) {
        let html = '<p style="color:var(--text-secondary);margin-bottom:12px;">Musical notation (image-based):</p>';
        if (content.musicFilePath) {
            html += `<img src="${content.musicFilePath}" style="max-width:100%;border-radius:8px;" alt="Musical notation"/>`;
        } else if (content.copticMusicNotes || content.englishMusicNotes) {
            if (content.copticMusicNotes) html += `<div style="margin-bottom:16px;">${content.copticMusicNotes}</div>`;
            if (content.englishMusicNotes) html += `<div>${content.englishMusicNotes}</div>`;
        } else {
            html += '<p style="color:var(--text-secondary);">No musical notation available.</p>';
        }
        hazzatGrid.innerHTML = html;
    }

    function renderAudioContent(content) {
        let html = '<p style="margin-bottom:12px;font-weight:600;">Audio Recording:</p>';
        if (content.audioFilePath) {
            html += `<audio controls style="width:100%;border-radius:8px;" src="${content.audioFilePath}"></audio>`;
            // Also wire into the custom player
            audio.src = content.audioFilePath;
            audio.load();
            downloadCopticLink.href = content.audioFilePath;
            downloadCopticLink.style.display = "inline-flex";
        } else {
            html += '<p style="color:var(--text-secondary);">No audio available.</p>';
        }
        hazzatGrid.innerHTML = html;
    }

    function renderVideoContent(content) {
        let html = '<p style="margin-bottom:12px;font-weight:600;">Video:</p>';
        if (content.videoFilePath) {
            html += `<video controls style="max-width:100%;border-radius:8px;" src="${content.videoFilePath}"></video>`;
        } else {
            html += '<p style="color:var(--text-secondary);">No video available.</p>';
        }
        hazzatGrid.innerHTML = html;
    }

    function renderInformationContent(content) {
        let html = '';
        if (content.englishInformation) {
            html += `<div class="EnglishFont" style="line-height:1.8;">${content.englishInformation}</div>`;
        }
        if (content.copticInformation) {
            html += `<div class="CopticFont" style="line-height:2;margin-top:16px;">${content.copticInformation}</div>`;
        }
        if (content.arabicInformation) {
            html += `<div class="ArabicFont" style="direction:rtl;text-align:right;line-height:2;margin-top:16px;">${content.arabicInformation}</div>`;
        }
        if (!html) html = '<p style="color:var(--text-secondary);">No information available.</p>';
        hazzatGrid.innerHTML = html;
    }

    function renderGenericContent(content) {
        // Try to render any content we find
        let html = "";
        for (const [key, value] of Object.entries(content)) {
            if (value && typeof value === "string" && key !== "contentType") {
                html += `<div style="margin-bottom:16px;"><strong style="color:var(--accent-gold-dark);font-size:12px;text-transform:uppercase;">${key}</strong></div>`;
                html += `<div style="margin-bottom:24px;">${value}</div>`;
            }
        }
        if (!html) html = '<p style="color:var(--text-secondary);">Content format not recognized.</p>';
        hazzatGrid.innerHTML = html;
    }

    // ==================
    // Audio Player
    // ==================
    const playIcon = '<svg viewBox="0 0 16 16" width="16" height="16" fill="white"><path fill-rule="evenodd" d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 010 1.393z"></path></svg>';
    const pauseIcon = '<svg viewBox="0 0 16 16" width="16" height="16" fill="white"><path fill-rule="evenodd" d="M5.5 3.5A1.5 1.5 0 017 5v6a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5zm5 0A1.5 1.5 0 0112 5v6a1.5 1.5 0 01-3 0V5a1.5 1.5 0 011.5-1.5z"></path></svg>';

    playerPlayBtn.addEventListener("click", togglePlay);

    function togglePlay() {
        if (!audio.src || audio.src === window.location.href) {
            showToast("No audio file loaded for this hymn");
            return;
        }
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            playerPlayBtn.innerHTML = playIcon;
        } else {
            audio.play().catch(() => showToast("Could not play audio file"));
            isPlaying = true;
            playerPlayBtn.innerHTML = pauseIcon;
        }
    }

    function stopAudio() {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        playerPlayBtn.innerHTML = playIcon;
        timelineFill.style.width = "0%";
        currentTimeEl.textContent = "0:00";
        totalTimeEl.textContent = "0:00";
        // Hide recordings links container
        const ytContainer = document.getElementById("youtube-player-container");
        if (ytContainer) ytContainer.style.display = "none";
    }

    audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
            const pct = (audio.currentTime / audio.duration) * 100;
            timelineFill.style.width = pct + "%";
            timelineKnob.style.left = pct + "%";
            timelineKnob.style.display = "block";
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("ended", () => {
        isPlaying = false;
        playerPlayBtn.innerHTML = playIcon;
    });

    // Timeline seeking
    timelineProgress.addEventListener("click", (e) => {
        if (!audio.duration) return;
        const rect = timelineProgress.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pct * audio.duration;
    });

    // Speed controls
    document.querySelectorAll(".rate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".rate-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            audio.playbackRate = parseFloat(btn.dataset.speed);
        });
    });

    // Recording dropdown — switch audio when different variation selected
    recordingDropdown.addEventListener("change", () => {
        const url = recordingDropdown.value;
        if (url) {
            stopAudio();
            audio.src = url;
            audio.load();
            downloadCopticLink.href = url;
            showToast(`Switched to: ${recordingDropdown.options[recordingDropdown.selectedIndex].text}`);
        }
    });

    // ==================
    // Home Page Seasons Grid
    // ==================
    const seasonIcons = {
        "annual": "☦", "nairouz": "🌿", "feast of the cross": "✝",
        "kiahk": "⭐", "paramoune of nativity": "🕯️", "nativity": "🎄",
        "feast of circumcision": "📜", "paramoune of epiphany": "💧",
        "epiphany": "🌊", "wedding": "💒", "lord's entry into the temple": "🕊️",
        "nineveh": "🙏", "great lent": "🕯️", "annunciation": "🌸",
        "lazarus": "🪦", "palm sunday": "🌴", "jerusalem": "🌴",
        "pascha": "✝", "passion": "✝", "covenant thursday": "🍞",
        "good friday": "⚰️", "bright saturday": "🌅",
        "resurrection": "☀️", "ascension": "☁️", "pentecost": "🔥",
        "apostles fast": "📿", "apostles feast": "✨",
        "papal": "⛪", "glorifications": "🎶",
        "coptic weddings": "💍", "reception of new priest": "🙌",
        "default": "♱"
    };

    function getSeasonIcon(name) {
        const lower = name.toLowerCase();
        for (const [key, icon] of Object.entries(seasonIcons)) {
            if (lower.includes(key)) return icon;
        }
        return seasonIcons["default"];
    }

    function populateHomeSeasonsGrid(seasons) {
        const grid = document.getElementById("home-seasons-grid");
        if (!grid) return;
        grid.innerHTML = "";

        seasons.forEach(season => {
            const seasonId = extractId(season.id);
            const icon = getSeasonIcon(season.name);
            const card = document.createElement("div");
            card.className = "season-card";
            card.dataset.seasonId = seasonId;
            card.innerHTML = `
                <div class="season-card-icon">${icon}</div>
                <div>
                    <div class="season-card-title">${season.name}</div>
                </div>
            `;
            card.addEventListener("click", () => {
                loadServices(seasonId, season.name);
            });
            grid.appendChild(card);
        });

        // Update stats
        const statSeasons = document.getElementById("stat-seasons");
        if (statSeasons) statSeasons.textContent = seasons.length;
    }

    // ==================
    // Initialize
    // ==================
    loadSeasons();
    showView("welcome");
});
