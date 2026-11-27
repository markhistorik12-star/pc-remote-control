using System.Drawing;
using System.Windows.Forms;
using PCRemote.Agent.Services;

namespace PCRemote.Agent.Tray;

public class TrayApplicationContext : ApplicationContext
{
    private readonly AgentConfigService _config;
    private readonly Icon _appIcon;
    private readonly NotifyIcon _notifyIcon;
    private readonly ContextMenuStrip _menu;
    private readonly Font _boldMenuFont;
    private readonly ToolStripMenuItem _autoStartItem;
    private readonly SynchronizationContext _uiContext;
    private PairingForm? _pairingForm;
    private readonly Action _onShutdownRequested;

    public TrayApplicationContext(
        AgentConfigService config,
        EventWaitHandle showEvent,
        CancellationToken shutdownToken,
        bool showOnStartup,
        Action onShutdownRequested)
    {
        _config = config;
        _onShutdownRequested = onShutdownRequested;
        _uiContext = SynchronizationContext.Current ?? new WindowsFormsSynchronizationContext();
        _appIcon = AppIconFactory.CreateTrayIcon();

        _menu = new ContextMenuStrip();
        _boldMenuFont = new Font(_menu.Font, FontStyle.Bold);

        var pairItem = new ToolStripMenuItem("Vincular teléfono (Mostrar QR)")
        {
            Font = _boldMenuFont
        };
        pairItem.Click += (_, _) => ShowPairingWindow();

        _autoStartItem = new ToolStripMenuItem("Iniciar automáticamente con Windows")
        {
            Checked = AgentConfigService.IsAutoStartEnabled(),
            CheckOnClick = false
        };
        _autoStartItem.Click += (_, _) =>
        {
            var next = !AgentConfigService.IsAutoStartEnabled();
            AgentConfigService.SetAutoStart(next);
            _autoStartItem.Checked = AgentConfigService.IsAutoStartEnabled();
        };

        var exitItem = new ToolStripMenuItem("Salir de PC Remote Hub");
        exitItem.Click += (_, _) => ExitCleanly();

        _menu.Items.Add(pairItem);
        _menu.Items.Add(new ToolStripSeparator());
        _menu.Items.Add(_autoStartItem);
        _menu.Items.Add(new ToolStripSeparator());
        _menu.Items.Add(exitItem);

        _notifyIcon = new NotifyIcon
        {
            Icon = _appIcon,
            Text = $"PC Remote Hub ({AgentConfigService.GetPrimaryLanIp()}:{_config.GetPort()})",
            ContextMenuStrip = _menu,
            Visible = true
        };
        _notifyIcon.MouseClick += (_, e) =>
        {
            if (e.Button == MouseButtons.Left)
            {
                ShowPairingWindow();
            }
        };

        // Listen for second-instance signal to pop open the QR window
        _ = Task.Run(() =>
        {
            var handles = new WaitHandle[] { showEvent, shutdownToken.WaitHandle };
            while (!shutdownToken.IsCancellationRequested)
            {
                var idx = WaitHandle.WaitAny(handles);
                if (idx == 0 && !shutdownToken.IsCancellationRequested)
                {
                    _uiContext.Post(_ => ShowPairingWindow(), null);
                }
                else
                {
                    break;
                }
            }
        });

        if (showOnStartup)
        {
            _uiContext.Post(_ => ShowPairingWindow(), null);
        }
    }

    public void ShowPairingWindow()
    {
        if (_pairingForm == null || _pairingForm.IsDisposed)
        {
            _pairingForm = new PairingForm(_config, _appIcon);
            _pairingForm.FormClosed += (_, _) =>
            {
                _pairingForm?.Dispose();
                _pairingForm = null;
                Program.TrimMemory();
            };
            _pairingForm.Show();
        }
        else
        {
            _pairingForm.RefreshDisplay();
            if (_pairingForm.WindowState == FormWindowState.Minimized)
            {
                _pairingForm.WindowState = FormWindowState.Normal;
            }
            _pairingForm.BringToFront();
            _pairingForm.Activate();
        }
    }

    private void ExitCleanly()
    {
        _notifyIcon.Visible = false;
        _pairingForm?.Close();
        _onShutdownRequested();
        ExitThread();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            _menu.Dispose();
            _boldMenuFont.Dispose();
            _pairingForm?.Dispose();
            _appIcon.Dispose();
        }
        base.Dispose(disposing);
    }
}
