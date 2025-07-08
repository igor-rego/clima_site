/**
 * Modern Weather Dashboard Application
 * Dashboard de Clima Moderno
 * 
 * A comprehensive weather dashboard with real-time data, interactive charts,
 * and responsive design with modern JavaScript features.
 */

class WeatherDashboard {
    constructor() {
        this.config = {
            API: {
                BASE_URL: 'https://api.open-meteo.com/v1',
                GEOCODING_URL: 'https://geocoding-api.open-meteo.com/v1',
                CACHE_DURATION: 300000, // 5 minutes
                REFRESH_INTERVAL: 300000 // 5 minutes
            },
            defaultLocations: [
                { name: "São Paulo", lat: -23.5505, lon: -46.6333 },
                { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729 },
                { name: "Brasília", lat: -15.7942, lon: -47.8822 },
                { name: "Salvador", lat: -12.9714, lon: -38.5011 },
                { name: "Fortaleza", lat: -3.7319, lon: -38.5267 }
            ]
        };

        this.state = {
            currentLocation: null,
            currentPeriod: '24h',
            lastUpdate: null,
            autoRefreshTimer: null,
            charts: {},
            apiCache: new Map(),
            isLoading: false,
            searchTimeout: null
        };

        this.init();
    }

    async init() {
        console.log('🚀 Initializing Modern Weather Dashboard');
        
        // Test connectivity first
        await this.testConnectivity();
        
        this.setupEventListeners();
        this.setupThemeToggle();
        this.setupAnimations();
        
        // Try to get user's current location
        await this.getCurrentLocationWeather();
        
        // Setup auto-refresh
        this.setupAutoRefresh();
        
        // Initialize with smooth loading animation
        this.showLoading(true);
    }

    async testConnectivity() {
        try {
            console.log('🌐 Testing API connectivity...');
            const testUrl = `${this.config.API.BASE_URL}/forecast?latitude=0&longitude=0&current=temperature_2m&timezone=auto`;
            const response = await fetch(testUrl, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                console.log('✅ API connectivity test passed');
            } else {
                console.warn('⚠️ API connectivity test failed with status:', response.status);
            }
        } catch (error) {
            console.warn('⚠️ API connectivity test failed:', error.message);
        }
    }

    setupEventListeners() {
        // Search input with improved debouncing
        const searchInput = document.getElementById('citySearch');
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.state.searchTimeout);
            this.state.searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    this.searchCity(query);
                } else if (query.length === 0) {
                    this.clearSearch();
                }
            }, 300);
        });

        // Enter key support
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.searchCity(query);
                }
            }
        });

        // Get current location button
        document.getElementById('getCurrentLocation').addEventListener('click', () => {
            this.getCurrentLocationWeather();
        });

        // Manual refresh button
        document.getElementById('manualRefresh').addEventListener('click', () => {
            if (this.state.currentLocation) {
                this.loadWeatherData(
                    this.state.currentLocation.lat, 
                    this.state.currentLocation.lon, 
                    this.state.currentLocation.name
                );
            }
        });

        // Period filter buttons with improved UX
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.updatePeriodFilter(e.target);
            });
        });

        // Error modal close
        document.getElementById('closeError').addEventListener('click', () => {
            this.hideError();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'r':
                        e.preventDefault();
                        document.getElementById('manualRefresh').click();
                        break;
                    case 'l':
                        e.preventDefault();
                        document.getElementById('getCurrentLocation').click();
                        break;
                }
            }
        });
    }

    setupThemeToggle() {
        // Add theme toggle button to header
        const headerControls = document.querySelector('.header-controls');
        const themeToggle = document.createElement('button');
        themeToggle.className = 'btn btn--outline btn--sm theme-toggle';
        themeToggle.innerHTML = '🌙';
        themeToggle.title = 'Alternar tema / Toggle theme';
        
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        headerControls.appendChild(themeToggle);

        // Initialize theme
        this.initializeTheme();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('weather-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            document.documentElement.setAttribute('data-color-scheme', savedTheme);
        } else if (prefersDark) {
            document.documentElement.setAttribute('data-color-scheme', 'dark');
        }
        
        this.updateThemeIcon();
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        localStorage.setItem('weather-theme', newTheme);
        
        this.updateThemeIcon();
        this.animateThemeTransition();
    }

    updateThemeIcon() {
        const themeToggle = document.querySelector('.theme-toggle');
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        themeToggle.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';
    }

    animateThemeTransition() {
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }

    setupAnimations() {
        // Add CSS for smooth animations
        const style = document.createElement('style');
        style.textContent = `
            .fade-in { animation: fadeIn 0.5s ease-in; }
            .slide-up { animation: slideUp 0.4s ease-out; }
            .scale-in { animation: scaleIn 0.3s ease-out; }
            
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            
            .card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
            .card:hover { transform: translateY(-2px); }
            
            .btn { transition: all 0.2s ease; }
            .btn:active { transform: scale(0.98); }
        `;
        document.head.appendChild(style);
    }

    async getCurrentLocationWeather() {
        if (navigator.geolocation) {
            this.showLoading(true);
            
            try {
                const position = await this.getCurrentPosition();
                const { latitude: lat, longitude: lon } = position.coords;
                
                console.log(`📍 Got user location: ${lat}, ${lon}`);
                await this.loadWeatherData(lat, lon, 'Localização Atual / Current Location');
                
            } catch (error) {
                console.warn('Geolocation failed, using default location:', error);
                const defaultLoc = this.config.defaultLocations[0];
                await this.loadWeatherData(defaultLoc.lat, defaultLoc.lon, defaultLoc.name);
            }
        } else {
            console.warn('Geolocation not supported');
            const defaultLoc = this.config.defaultLocations[0];
            await this.loadWeatherData(defaultLoc.lat, defaultLoc.lon, defaultLoc.name);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false
            });
        });
    }

    async searchCity(cityName) {
        try {
            console.log(`🔍 Searching for city: ${cityName}`);
            
            // Try multiple approaches for geocoding
            let cityData = null;
            
            // Approach 1: Direct API call
            try {
                const url = `${this.config.API.GEOCODING_URL}/search?name=${encodeURIComponent(cityName)}&count=5&language=pt&format=json`;
                console.log('🔍 Geocoding URL:', url);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                });
                
                console.log('🔍 Response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('🔍 Geocoding response:', data);
                    
                    if (data.results && data.results.length > 0) {
                        cityData = data.results[0];
                    }
                }
            } catch (apiError) {
                console.warn('API geocoding failed, trying fallback:', apiError.message);
            }
            
            // Approach 2: Fallback to predefined cities
            if (!cityData) {
                console.log('🔄 Using fallback city search');
                cityData = this.searchPredefinedCity(cityName);
            }
            
            if (cityData) {
                console.log(`✅ Found city: ${cityData.name}`);
                await this.loadWeatherData(cityData.latitude, cityData.longitude, `${cityData.name}, ${cityData.country || ''}`);
            } else {
                this.showError('Cidade não encontrada / City not found');
            }
            
        } catch (error) {
            console.error('City search failed:', error);
            console.error('Error details:', error.stack);
            this.showError(`Erro ao buscar cidade: ${error.message}`);
        }
    }

    // Fallback city search using predefined locations
    searchPredefinedCity(cityName) {
        const searchTerm = cityName.toLowerCase().trim();
        
        // Extended list of Brazilian cities
        const cities = [
            { name: "São Paulo", lat: -23.5505, lon: -46.6333, country: "Brasil" },
            { name: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, country: "Brasil" },
            { name: "Brasília", lat: -15.7942, lon: -47.8822, country: "Brasil" },
            { name: "Salvador", lat: -12.9714, lon: -38.5011, country: "Brasil" },
            { name: "Fortaleza", lat: -3.7319, lon: -38.5267, country: "Brasil" },
            { name: "Belo Horizonte", lat: -19.9167, lon: -43.9345, country: "Brasil" },
            { name: "Manaus", lat: -3.1190, lon: -60.0217, country: "Brasil" },
            { name: "Curitiba", lat: -25.4289, lon: -49.2671, country: "Brasil" },
            { name: "Recife", lat: -8.0476, lon: -34.8770, country: "Brasil" },
            { name: "Porto Alegre", lat: -30.0346, lon: -51.2177, country: "Brasil" },
            { name: "Belém", lat: -1.4554, lon: -48.4898, country: "Brasil" },
            { name: "Goiânia", lat: -16.6864, lon: -49.2653, country: "Brasil" },
            { name: "Guarulhos", lat: -23.4543, lon: -46.5339, country: "Brasil" },
            { name: "Campinas", lat: -22.9064, lon: -47.0616, country: "Brasil" },
            { name: "Natal", lat: -5.7945, lon: -35.2090, country: "Brasil" },
            { name: "Maceió", lat: -9.6498, lon: -35.7089, country: "Brasil" },
            { name: "João Pessoa", lat: -7.1150, lon: -34.8631, country: "Brasil" },
            { name: "Teresina", lat: -5.0892, lon: -42.8016, country: "Brasil" },
            { name: "São Luís", lat: -2.5297, lon: -44.3028, country: "Brasil" },
            { name: "Campo Grande", lat: -20.4486, lon: -54.6295, country: "Brasil" },
            { name: "Cuiabá", lat: -15.6010, lon: -56.0974, country: "Brasil" },
            { name: "Aracaju", lat: -10.9091, lon: -37.0677, country: "Brasil" },
            { name: "Vitória", lat: -20.2976, lon: -40.2958, country: "Brasil" },
            { name: "Florianópolis", lat: -27.5969, lon: -48.5495, country: "Brasil" },
            { name: "Palmas", lat: -10.1753, lon: -48.2982, country: "Brasil" },
            { name: "Boa Vista", lat: 2.8235, lon: -60.6758, country: "Brasil" },
            { name: "Porto Velho", lat: -8.7619, lon: -63.9039, country: "Brasil" },
            { name: "Rio Branco", lat: -9.9754, lon: -67.8249, country: "Brasil" },
            { name: "Macapá", lat: 0.0349, lon: -51.0504, country: "Brasil" }
        ];
        
        // Search for exact match first
        let match = cities.find(city => 
            city.name.toLowerCase() === searchTerm ||
            city.name.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(city.name.toLowerCase())
        );
        
        // If no exact match, search for partial matches
        if (!match) {
            match = cities.find(city => 
                city.name.toLowerCase().includes(searchTerm) ||
                searchTerm.includes(city.name.toLowerCase())
            );
        }
        
        // If still no match, search for cities that start with the search term
        if (!match) {
            match = cities.find(city => 
                city.name.toLowerCase().startsWith(searchTerm) ||
                searchTerm.startsWith(city.name.toLowerCase())
            );
        }
        
        return match;
    }

    clearSearch() {
        document.getElementById('citySearch').value = '';
        // Optionally reload current location data
        if (this.state.currentLocation) {
            this.loadWeatherData(
                this.state.currentLocation.lat, 
                this.state.currentLocation.lon, 
                this.state.currentLocation.name
            );
        }
    }

    async loadWeatherData(lat, lon, locationName) {
        try {
            console.log(`🌤️ Loading weather for: ${locationName} (${lat}, ${lon})`);
            this.showLoading(true);
            
            // Store current location
            this.state.currentLocation = { lat, lon, name: locationName };
            
            // Load all data in parallel for better performance
            const [currentWeather, forecastData, chartsData] = await Promise.all([
                this.loadCurrentWeather(lat, lon, locationName),
                this.loadForecastData(lat, lon),
                this.loadChartsData(lat, lon)
            ]);
            
            // Update UI
            this.updateLastUpdateTime();
            this.showLoading(false);
            
            // Add success animation
            this.animateSuccess();
            
        } catch (error) {
            console.error('Failed to load weather data:', error);
            this.showError(`Erro ao carregar dados climáticos: ${error.message}`);
            this.showLoading(false);
        }
    }

    async loadCurrentWeather(lat, lon, locationName) {
        const cacheKey = `current_${lat}_${lon}`;
        
        // Check cache first
        if (this.state.apiCache.has(cacheKey)) {
            const cachedData = this.state.apiCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < this.config.API.CACHE_DURATION) {
                console.log('📦 Using cached current weather data');
                this.displayCurrentWeather(cachedData.data, locationName);
                return cachedData.data;
            }
        }
        
        try {
            // Use the correct endpoint for current weather data
            const url = `${this.config.API.BASE_URL}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto`;
            
            console.log('🌤️ Fetching current weather from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('🌤️ Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Current weather data received:', data);
            
            // Cache the data
            this.state.apiCache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            this.displayCurrentWeather(data, locationName);
            return data;
            
        } catch (error) {
            console.error('Failed to fetch current weather:', error);
            console.error('Error details:', error.stack);
            
            // Fallback to demo data
            console.log('🔄 Using demo data as fallback');
            const demoData = this.getDemoCurrentWeather();
            this.displayCurrentWeather(demoData, locationName);
            return demoData;
        }
    }

    // Demo data fallback
    getDemoCurrentWeather() {
        return {
            current: {
                time: new Date().toISOString(),
                temperature_2m: 22,
                apparent_temperature: 24,
                relative_humidity_2m: 65,
                precipitation: 0,
                weather_code: 1,
                wind_speed_10m: 15,
                wind_direction_10m: 180
            }
        };
    }

    displayCurrentWeather(data, locationName) {
        const current = data.current;
        
        // Update location and time
        document.getElementById('currentLocationName').textContent = locationName;
        document.getElementById('currentDateTime').textContent = new Date(current.time).toLocaleString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Update temperature and weather
        document.getElementById('currentTemp').textContent = `${Math.round(current.temperature_2m)}°`;
        document.getElementById('weatherDescription').textContent = this.getWeatherDescription(current.weather_code);
        
        // Update details
        document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°`;
        document.getElementById('humidity').textContent = `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('precipitation').textContent = `${current.precipitation.toFixed(1)} mm`;
        
        // Update weather background
        this.updateWeatherBackground(current.weather_code);
        
        // Show content with animation
        const content = document.getElementById('currentWeatherContent');
        content.style.display = 'block';
        content.classList.add('fade-in');
        
        // Hide loading
        document.getElementById('currentWeatherLoading').style.display = 'none';
    }

    async loadForecastData(lat, lon) {
        const cacheKey = `forecast_${lat}_${lon}`;
        
        if (this.state.apiCache.has(cacheKey)) {
            const cachedData = this.state.apiCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < this.config.API.CACHE_DURATION) {
                console.log('📦 Using cached forecast data');
                this.displayForecast(cachedData.data);
                return cachedData.data;
            }
        }
        
        try {
            const url = `${this.config.API.BASE_URL}/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            this.state.apiCache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            this.displayForecast(data);
            return data;
            
        } catch (error) {
            console.error('Failed to fetch forecast data:', error);
            
            // Fallback to demo data
            console.log('🔄 Using demo forecast data as fallback');
            const demoData = this.getDemoForecast();
            this.displayForecast(demoData);
            return demoData;
        }
    }

    // Demo forecast data fallback
    getDemoForecast() {
        const today = new Date();
        const times = [];
        const maxTemps = [];
        const minTemps = [];
        const weatherCodes = [];
        const precipitation = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            times.push(date.toISOString().split('T')[0]);
            maxTemps.push(20 + Math.floor(Math.random() * 15));
            minTemps.push(10 + Math.floor(Math.random() * 10));
            weatherCodes.push([0, 1, 2, 3][Math.floor(Math.random() * 4)]);
            precipitation.push(Math.floor(Math.random() * 30));
        }
        
        return {
            daily: {
                time: times,
                temperature_2m_max: maxTemps,
                temperature_2m_min: minTemps,
                weather_code: weatherCodes,
                precipitation_probability_max: precipitation
            }
        };
    }

    displayForecast(data) {
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';
        
        data.daily.time.forEach((date, index) => {
            if (index >= 7) return; // Only show 7 days
            
            const day = new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' });
            const maxTemp = Math.round(data.daily.temperature_2m_max[index]);
            const minTemp = Math.round(data.daily.temperature_2m_min[index]);
            const weatherCode = data.daily.weather_code[index];
            const precipitation = data.daily.precipitation_probability_max[index];
            
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card slide-up';
            forecastCard.style.animationDelay = `${index * 0.1}s`;
            
            forecastCard.innerHTML = `
                <div class="forecast-day">${day}</div>
                <div class="forecast-icon">${this.getWeatherIcon(weatherCode)}</div>
                <div class="forecast-temps">
                    <span class="temp-high">${maxTemp}°</span>
                    <span class="temp-low">${minTemp}°</span>
                </div>
                <div class="forecast-desc">${this.getWeatherDescription(weatherCode)}</div>
                <div class="forecast-precipitation">${precipitation}%</div>
            `;
            
            forecastGrid.appendChild(forecastCard);
        });
    }

    async loadChartsData(lat, lon) {
        const cacheKey = `charts_${lat}_${lon}_${this.state.currentPeriod}`;
        
        if (this.state.apiCache.has(cacheKey)) {
            const cachedData = this.state.apiCache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < this.config.API.CACHE_DURATION) {
                console.log('📦 Using cached charts data');
                this.displayCharts(cachedData.data, this.state.currentPeriod);
                return cachedData.data;
            }
        }
        
        try {
            const url = `${this.config.API.BASE_URL}/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            this.state.apiCache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            this.displayCharts(data, this.state.currentPeriod);
            return data;
            
        } catch (error) {
            console.error('Failed to fetch charts data:', error);
            
            // Fallback to demo data
            console.log('🔄 Using demo charts data as fallback');
            const demoData = this.getDemoChartsData();
            this.displayCharts(demoData, this.state.currentPeriod);
            return demoData;
        }
    }

    // Demo charts data fallback
    getDemoChartsData() {
        const hours = this.getHoursForPeriod(this.state.currentPeriod);
        const times = [];
        const temperatures = [];
        const humidity = [];
        const wind = [];
        const precipitation = [];
        
        const now = new Date();
        for (let i = 0; i < hours; i++) {
            const time = new Date(now);
            time.setHours(now.getHours() + i);
            times.push(time.toISOString());
            temperatures.push(20 + Math.floor(Math.random() * 10));
            humidity.push(40 + Math.floor(Math.random() * 40));
            wind.push(5 + Math.floor(Math.random() * 20));
            precipitation.push(Math.random() * 2);
        }
        
        return {
            hourly: {
                time: times,
                temperature_2m: temperatures,
                relative_humidity_2m: humidity,
                wind_speed_10m: wind,
                precipitation: precipitation
            }
        };
    }

    displayCharts(data, period) {
        const hours = this.getHoursForPeriod(period);
        const chartData = this.processChartData(data, hours);
        
        // Destroy existing charts
        Object.values(this.state.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        this.state.charts = {};
        
        // Create new charts with improved styling
        this.createChart('temperatureChart', 'Temperatura / Temperature', chartData.temperature, '°C', 'rgba(255, 99, 132, 0.8)');
        this.createChart('humidityChart', 'Umidade / Humidity', chartData.humidity, '%', 'rgba(54, 162, 235, 0.8)');
        this.createChart('windChart', 'Velocidade do Vento / Wind Speed', chartData.wind, 'km/h', 'rgba(75, 192, 192, 0.8)');
        this.createChart('precipitationChart', 'Precipitação / Precipitation', chartData.precipitation, 'mm', 'rgba(153, 102, 255, 0.8)');
    }

    createChart(canvasId, label, data, unit, color) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        this.state.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: label,
                    data: data.values,
                    borderColor: color,
                    backgroundColor: color.replace('0.8', '0.1'),
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: color,
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)',
                            callback: function(value) {
                                return value + unit;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    getHoursForPeriod(period) {
        switch(period) {
            case '24h': return 24;
            case '7d': return 24 * 7;
            case '30d': return 24 * 30;
            default: return 24;
        }
    }

    processChartData(data, hours) {
        const labels = [];
        const temperature = [];
        const humidity = [];
        const wind = [];
        const precipitation = [];
        
        for (let i = 0; i < Math.min(hours, data.hourly.time.length); i++) {
            const time = new Date(data.hourly.time[i]);
            labels.push(time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
            
            temperature.push(Math.round(data.hourly.temperature_2m[i]));
            humidity.push(Math.round(data.hourly.relative_humidity_2m[i]));
            wind.push(Math.round(data.hourly.wind_speed_10m[i]));
            precipitation.push(data.hourly.precipitation[i].toFixed(1));
        }
        
        return {
            temperature: { labels, values: temperature },
            humidity: { labels, values: humidity },
            wind: { labels, values: wind },
            precipitation: { labels, values: precipitation }
        };
    }

    updatePeriodFilter(clickedBtn) {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        clickedBtn.classList.add('active');
        
        // Update current period and reload charts
        this.state.currentPeriod = clickedBtn.dataset.period;
        if (this.state.currentLocation) {
            this.loadChartsData(this.state.currentLocation.lat, this.state.currentLocation.lon);
        }
    }

    setupAutoRefresh() {
        if (this.state.autoRefreshTimer) {
            clearInterval(this.state.autoRefreshTimer);
        }
        
        this.state.autoRefreshTimer = setInterval(() => {
            if (this.state.currentLocation) {
                this.loadWeatherData(
                    this.state.currentLocation.lat, 
                    this.state.currentLocation.lon, 
                    this.state.currentLocation.name
                );
            }
        }, this.config.API.REFRESH_INTERVAL);
    }

    updateLastUpdateTime() {
        this.state.lastUpdate = new Date();
        const lastUpdateElement = document.getElementById('lastUpdate');
        lastUpdateElement.textContent = `Atualizado: ${this.state.lastUpdate.toLocaleTimeString('pt-BR')}`;
        lastUpdateElement.classList.add('status--success');
        
        setTimeout(() => {
            lastUpdateElement.classList.remove('status--success');
        }, 2000);
    }

    showLoading(show) {
        this.state.isLoading = show;
        const loadingElement = document.getElementById('currentWeatherLoading');
        const contentElement = document.getElementById('currentWeatherContent');
        
        if (show) {
            loadingElement.style.display = 'flex';
            contentElement.style.display = 'none';
        } else {
            loadingElement.style.display = 'none';
            contentElement.style.display = 'block';
        }
    }

    showError(message) {
        const modal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        modal.style.display = 'flex';
        modal.classList.add('fade-in');
    }

    hideError() {
        const modal = document.getElementById('errorModal');
        modal.style.display = 'none';
    }

    animateSuccess() {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('scale-in');
        });
        
        setTimeout(() => {
            cards.forEach(card => card.classList.remove('scale-in'));
        }, 1000);
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Céu limpo / Clear sky',
            1: 'Parcialmente nublado / Partly cloudy',
            2: 'Nublado / Cloudy',
            3: 'Neblina / Fog',
            45: 'Neblina / Foggy',
            48: 'Neblina com geada / Foggy with frost',
            51: 'Chuva leve / Light drizzle',
            53: 'Chuva moderada / Moderate drizzle',
            55: 'Chuva forte / Heavy drizzle',
            61: 'Chuva leve / Light rain',
            63: 'Chuva moderada / Moderate rain',
            65: 'Chuva forte / Heavy rain',
            71: 'Neve leve / Light snow',
            73: 'Neve moderada / Moderate snow',
            75: 'Neve forte / Heavy snow',
            77: 'Granizo / Snow grains',
            80: 'Chuva com trovões / Rain showers',
            81: 'Chuva forte com trovões / Heavy rain showers',
            82: 'Chuva muito forte / Very heavy rain',
            85: 'Neve com trovões / Snow showers',
            86: 'Neve forte com trovões / Heavy snow showers',
            95: 'Tempestade / Thunderstorm',
            96: 'Tempestade com granizo / Thunderstorm with hail',
            99: 'Tempestade forte com granizo / Heavy thunderstorm with hail'
        };
        
        return descriptions[code] || 'Desconhecido / Unknown';
    }

    getWeatherIcon(code) {
        const icons = {
            0: '☀️', // Clear sky
            1: '🌤️', // Partly cloudy
            2: '☁️', // Cloudy
            3: '🌫️', // Fog
            45: '🌫️', // Foggy
            48: '🌫️', // Foggy with frost
            51: '🌦️', // Light drizzle
            53: '🌦️', // Moderate drizzle
            55: '🌧️', // Heavy drizzle
            61: '🌧️', // Light rain
            63: '🌧️', // Moderate rain
            65: '🌧️', // Heavy rain
            71: '🌨️', // Light snow
            73: '🌨️', // Moderate snow
            75: '🌨️', // Heavy snow
            77: '🌨️', // Snow grains
            80: '⛈️', // Rain showers
            81: '⛈️', // Heavy rain showers
            82: '⛈️', // Very heavy rain
            85: '🌨️', // Snow showers
            86: '🌨️', // Heavy snow showers
            95: '⛈️', // Thunderstorm
            96: '⛈️', // Thunderstorm with hail
            99: '⛈️'  // Heavy thunderstorm with hail
        };
        
        return icons[code] || '❓';
    }

    updateWeatherBackground(code) {
        const body = document.body;
        
        // Remove existing weather classes
        body.className = body.className.replace(/weather-\w+/g, '');
        
        // Add appropriate weather class
        if (code >= 0 && code <= 3) {
            body.classList.add('weather-clear');
        } else if (code >= 45 && code <= 48) {
            body.classList.add('weather-fog');
        } else if (code >= 51 && code <= 55) {
            body.classList.add('weather-drizzle');
        } else if (code >= 61 && code <= 82) {
            body.classList.add('weather-rain');
        } else if (code >= 71 && code <= 86) {
            body.classList.add('weather-snow');
        } else if (code >= 95 && code <= 99) {
            body.classList.add('weather-thunderstorm');
        }
    }

    cleanup() {
        if (this.state.autoRefreshTimer) {
            clearInterval(this.state.autoRefreshTimer);
        }
        
        Object.values(this.state.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.weatherDashboard = new WeatherDashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.weatherDashboard) {
        window.weatherDashboard.cleanup();
    }
});