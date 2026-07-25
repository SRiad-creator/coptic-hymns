$scratchDir = "C:\Users\sam_r\.gemini\antigravity\scratch"
$ytdlp = Join-Path $scratchDir "yt-dlp.exe"
$ffmpeg = Join-Path $scratchDir "ffmpeg.exe"
$outputDir = Join-Path $scratchDir "hazzat-downloader\audio"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force
}

$hymns = @(
    # Coptic Recordings by Moallem Bola Mounir
    @{
        name = "ni_sheroubim"
        query = 'ytsearch1:bola mounir ni sheroubim'
        title = "Ni Sheroubim (Coptic)"
    },
    @{
        name = "shere_ne_maria"
        query = 'ytsearch1:bola mounir shere ne maria'
        title = "Shere ne Maria (Coptic)"
    },
    @{
        name = "omonogenes"
        query = 'ytsearch1:bola mounir omonogenes'
        title = "Omonogenes (Coptic)"
    },
    @{
        name = "je_nai_nan"
        query = 'ytsearch1:bola mounir je nai nan'
        title = "Je Nai Nan (Coptic)"
    },
    @{
        name = "pek_throne"
        query = 'ytsearch1:bola mounir pekethronos'
        title = "Pek Throne (Coptic)"
    },
    @{
        name = "thok_te_ti_gom"
        query = 'ytsearch1:bola mounir thok te ti gom'
        title = "Thok Te Ti Gom (Coptic)"
    },
    @{
        name = "second_hoos"
        query = 'ytsearch1:bola mounir second hoos'
        title = "Second Hoos (Coptic)"
    },
    @{
        name = "khen_oushot"
        query = 'ytsearch1:bola mounir khen oushot'
        title = "Khen Oushot (Coptic)"
    },
    # English Recordings by Coptic Hymns in English
    @{
        name = "ni_sheroubim_english"
        query = 'ytsearch1:coptic hymns in english cherubim'
        title = "Ni Sheroubim (English)"
    },
    @{
        name = "shere_ne_maria_english"
        query = 'ytsearch1:coptic hymns in english hail to you mary'
        title = "Shere ne Maria (English)"
    },
    @{
        name = "omonogenes_english"
        query = 'ytsearch1:coptic hymns in english only begotten son'
        title = "Omonogenes (English)"
    },
    @{
        name = "je_nai_nan_english"
        query = 'ytsearch1:coptic hymns in english have mercy on us'
        title = "Je Nai Nan (English)"
    },
    @{
        name = "pek_throne_english"
        query = 'ytsearch1:coptic hymns in english thy throne o god'
        title = "Pek Throne (English)"
    },
    @{
        name = "thok_te_ti_gom_english"
        query = 'ytsearch1:coptic hymns in english thine is the power'
        title = "Thok Te Ti Gom (English)"
    },
    @{
        name = "second_hoos_english"
        query = 'ytsearch1:coptic hymns in english second canticle'
        title = "Second Hoos (English)"
    },
    @{
        name = "khen_oushot_english"
        query = 'ytsearch1:coptic hymns in english first canticle lobsh'
        title = "Khen Oushot (English)"
    }
)

foreach ($hymn in $hymns) {
    Write-Host "Downloading $($hymn.title)..."
    $outputPath = Join-Path $outputDir ($hymn.name + ".mp3")
    
    # Skip if file already exists (saves download bandwidth)
    if (Test-Path $outputPath) {
        Write-Host "File already exists, skipping: $($hymn.name).mp3"
        continue
    }

    $args = @(
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "5",
        "--ffmpeg-location", $ffmpeg,
        "-o", (Join-Path $outputDir ($hymn.name + ".%(ext)s")),
        $hymn.query
    )
    & $ytdlp @args
}

Write-Host "Downloads complete!"
