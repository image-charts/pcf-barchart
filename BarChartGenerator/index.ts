/**
 * BarChartGenerator - Image-Charts PCF Component
 *
 * Generates signed Image-Charts Bar Charts for Microsoft Power Apps.
 *
 * @version 1.0.0
 * @see https://documentation.image-charts.com/bar-charts/
 */

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import {
  computeHmacSha256Sync,
  normalizeColors,
  parseDataValues,
  formatDataAwesome,
  parseLabels,
  formatLabels,
  parseAdvancedOptions,
  isValidHostname,
  debounce,
  loadImageWithRetry,
  createErrorPlaceholder,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_TIMEOUT_MS
} from "../shared/image-charts-utils";

const COMPONENT_NAME = 'barchart';

export class BarChartGenerator implements ComponentFramework.StandardControl<IInputs, IOutputs> {

  private _container!: HTMLDivElement;
  private _imgElement!: HTMLImageElement;
  private _debugElement: HTMLDivElement | null = null;
  private _signedUrl: string = "";
  private _notifyOutputChanged!: () => void;
  private _isLoading: boolean = false;
  private _debouncedUpdate!: (context: ComponentFramework.Context<IInputs>) => void;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this._notifyOutputChanged = notifyOutputChanged;
    this._container = container;
    this._container.className = 'image-charts-barchart-container';

    this._imgElement = document.createElement("img");
    this._imgElement.setAttribute("alt", "Bar Chart");
    this._imgElement.className = 'image-charts-barchart';
    this._container.appendChild(this._imgElement);

    this._debouncedUpdate = debounce(
      (ctx: ComponentFramework.Context<IInputs>) => this._performUpdate(ctx),
      DEFAULT_DEBOUNCE_MS
    );
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this._debouncedUpdate(context);
  }

  private _performUpdate(context: ComponentFramework.Context<IInputs>): void {
    const accountId = context.parameters.accountId?.raw || "";
    const secretKey = context.parameters.secretKey?.raw || "";
    const privateCloudDomain = context.parameters.privateCloudDomain?.raw || "";
    const data = context.parameters.data?.raw || "";
    const labels = context.parameters.labels?.raw || "";
    const colors = context.parameters.colors?.raw || "";
    const title = context.parameters.title?.raw || "";
    const orientation = context.parameters.orientation?.raw || "vertical";
    const chartSize = context.parameters.chartSize?.raw || "300x300";
    const advancedOptions = context.parameters.advancedOptions?.raw || "";
    const showDebugUrl = context.parameters.showDebugUrl?.raw || false;
    const errorPlaceholderUrl = context.parameters.errorPlaceholderUrl?.raw || "";

    // Validate data
    if (!data) {
      this._showError("Missing chart data", errorPlaceholderUrl);
      return;
    }

    // Validate authentication
    const isEnterpriseMode = accountId && secretKey;
    const isPrivateCloudMode = privateCloudDomain && isValidHostname(privateCloudDomain);

    if (!isEnterpriseMode && !isPrivateCloudMode) {
      this._showError("Missing authentication. Provide accountId + secretKey (Enterprise) or privateCloudDomain (Private Cloud).", errorPlaceholderUrl);
      return;
    }

    // Build URL
    const url = this._buildBarChartUrl({
      accountId,
      secretKey,
      privateCloudDomain,
      data,
      labels,
      colors,
      title,
      orientation,
      chartSize,
      advancedOptions
    });

    this._signedUrl = url;
    this._loadImage(url, errorPlaceholderUrl);
    this._updateDebugDisplay(showDebugUrl, url);
    this._notifyOutputChanged();
  }

  private _buildBarChartUrl(params: {
    accountId: string;
    secretKey: string;
    privateCloudDomain: string;
    data: string;
    labels: string;
    colors: string;
    title: string;
    orientation: string;
    chartSize: string;
    advancedOptions: string;
  }): string {
    const host = params.privateCloudDomain || 'image-charts.com';
    const baseUrl = `https://${host}/chart`;

    // Determine chart type based on orientation
    const chartType = params.orientation === 'horizontal' ? 'bhs' : 'bvs';

    // Parse and format data
    const dataValues = parseDataValues(params.data);
    const formattedData = formatDataAwesome(dataValues);

    const queryParts: string[] = [
      `cht=${chartType}`,
      `chs=${params.chartSize}`,
      `chd=${formattedData}`
    ];

    // Add labels
    if (params.labels) {
      const labelValues = parseLabels(params.labels);
      queryParts.push(`chl=${formatLabels(labelValues)}`);
    }

    // Add colors
    if (params.colors) {
      const normalizedColors = normalizeColors(params.colors);
      if (normalizedColors) {
        queryParts.push(`chco=${normalizedColors}`);
      }
    }

    // Add title
    if (params.title) {
      queryParts.push(`chtt=${params.title}`);
    }

    // Add advanced options
    const advancedParams = parseAdvancedOptions(params.advancedOptions);
    for (const [key, value] of Object.entries(advancedParams)) {
      queryParts.push(`${key}=${value}`);
    }

    // Add account ID for Enterprise mode
    if (params.accountId && !params.privateCloudDomain) {
      queryParts.push(`icac=${params.accountId}`);
    }

    const queryString = queryParts.join('&');

    // Sign if Enterprise mode
    if (params.accountId && params.secretKey && !params.privateCloudDomain) {
      const signature = computeHmacSha256Sync(params.secretKey, queryString);
      return `${baseUrl}?${queryString}&ichm=${signature}`;
    }

    return `${baseUrl}?${queryString}`;
  }

  private _loadImage(url: string, errorPlaceholderUrl: string): void {
    if (this._isLoading) return;
    this._isLoading = true;
    this._clearError();

    loadImageWithRetry(url, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      totalTimeout: DEFAULT_TIMEOUT_MS
    })
      .then(() => {
        this._imgElement.src = url;
        this._imgElement.style.display = 'block';
        this._isLoading = false;
      })
      .catch((error: Error) => {
        console.error(`[BarChartGenerator] Image load failed:`, error.message);
        this._showError(error.message, errorPlaceholderUrl);
        this._isLoading = false;
      });
  }

  private _showError(message: string, customPlaceholderUrl: string): void {
    this._imgElement.style.display = 'none';
    this._signedUrl = "";
    const existingError = this._container.querySelector('.image-charts-error');
    if (existingError) existingError.remove();
    const errorElement = createErrorPlaceholder(message, customPlaceholderUrl || undefined);
    this._container.appendChild(errorElement);
    this._notifyOutputChanged();
  }

  private _clearError(): void {
    const existingError = this._container.querySelector('.image-charts-error');
    if (existingError) existingError.remove();
  }

  private _updateDebugDisplay(showDebug: boolean, url: string): void {
    if (showDebug) {
      if (!this._debugElement) {
        this._debugElement = document.createElement('div');
        this._debugElement.className = 'image-charts-debug-url';
        this._container.appendChild(this._debugElement);
      }
      this._debugElement.textContent = url;
      this._debugElement.style.display = 'block';
    } else if (this._debugElement) {
      this._debugElement.style.display = 'none';
    }
  }

  public getOutputs(): IOutputs {
    return { signedUrl: this._signedUrl };
  }

  public destroy(): void {}
}
