using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using PCRemote.Agent.Services;
using QRCoder;

namespace PCRemote.Agent.Tray;

public class PairingForm : Form
{
    private readonly AgentConfigService _config;
    private readonly Bitmap _brandBitmap;
    private readonly PictureBox _qrBox;
    private readonly ModernButton _copyBtn;
    private string _currentIpPort = "";
    private string _currentToken = "";

    public PairingForm(AgentConfigService config, Icon appIcon)
    {
        _config = config;
        _brandBitmap = appIcon.ToBitmap();

        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.ResizeRedraw,
            true);

        Text = "PC Remote Hub";
        Icon = appIcon;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        MinimizeBox = true;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(410, 540);
        BackColor = Color.FromArgb(10, 14, 23);
        ForeColor = Color.FromArgb(241, 245, 249);
        Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

        _qrBox = new PictureBox
        {
            Bounds = new Rectangle(109, 128, 192, 192),
            SizeMode = PictureBoxSizeMode.Zoom,
            BackColor = Color.White
        };

        _copyBtn = new ModernButton
        {
            Text = "Copiar conexión",
            IsPrimary = true,
            Bounds = new Rectangle(28, 468, 172, 44)
        };
        _copyBtn.Click += (_, _) =>
        {
            Clipboard.SetText($"IP: {_currentIpPort} | Token: {_currentToken}");
            _copyBtn.Text = "✓ ¡Copiado!";
            _copyBtn.UseSuccessTone = true;
            _copyBtn.Invalidate();
            var t = new System.Windows.Forms.Timer { Interval = 1600 };
            t.Tick += (_, _) =>
            {
                _copyBtn.Text = "Copiar conexión";
                _copyBtn.UseSuccessTone = false;
                _copyBtn.Invalidate();
                t.Stop();
                t.Dispose();
            };
            t.Start();
        };

        var regenBtn = new ModernButton
        {
            Text = "Nuevo Token",
            IsPrimary = false,
            Bounds = new Rectangle(210, 468, 172, 44)
        };
        regenBtn.Click += (_, _) =>
        {
            var confirm = MessageBox.Show(
                "¿Generar un nuevo código Token? Tendrás que volver a vincular tu teléfono.",
                "Regenerar Token",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);
            if (confirm == DialogResult.Yes)
            {
                _config.RegenerateToken();
                RefreshDisplay();
            }
        };

        Controls.AddRange([_qrBox, _copyBtn, regenBtn]);
        RefreshDisplay();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        AppIconFactory.ApplyDarkTitleBar(Handle);
    }

    public void RefreshDisplay()
    {
        var ip = AgentConfigService.GetPrimaryLanIp();
        var port = _config.GetPort();
        var token = _config.GetToken();
        var host = Uri.EscapeDataString(Environment.MachineName);

        _currentIpPort = $"{ip}:{port}";
        _currentToken = token;

        var payload = $"pcremote://pair?ip={ip}&port={port}&token={token}&name={host}";
        using var qrGen = new QRCodeGenerator();
        using var qrData = qrGen.CreateQrCode(payload, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new QRCode(qrData);
        var oldImage = _qrBox.Image;
        _qrBox.Image = qrCode.GetGraphic(8, Color.FromArgb(15, 23, 42), Color.White, false);
        oldImage?.Dispose();

        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

        // Top subtle ambient glow
        using (var headerGlow = new LinearGradientBrush(
            new Rectangle(0, 0, Width, 150),
            Color.FromArgb(45, 14, 165, 233),
            Color.FromArgb(0, 10, 14, 23),
            90f))
        {
            g.FillRectangle(headerGlow, 0, 0, Width, 150);
        }

        // Brand icon + Title + Online Pill
        g.DrawImage(_brandBitmap, new Rectangle(28, 20, 44, 44));

        using (var titleFont = new Font("Segoe UI Semibold", 15f, FontStyle.Bold))
        using (var whiteBrush = new SolidBrush(Color.White))
        {
            g.DrawString("PC Remote Hub", titleFont, whiteBrush, 82, 18);
        }

        // Status pill
        var statusText = $"● En línea  •  {Environment.MachineName}";
        using (var pillFont = new Font("Segoe UI Semibold", 8.2f, FontStyle.Bold))
        {
            var sz = g.MeasureString(statusText, pillFont);
            var pillRect = new Rectangle(84, 46, (int)sz.Width + 16, 22);
            using var pillPath = AppIconFactory.RoundedRect(pillRect, 11);
            using var pillFill = new SolidBrush(Color.FromArgb(30, 52, 211, 153));
            using var pillBorder = new Pen(Color.FromArgb(75, 52, 211, 153), 1f);
            using var pillTextBrush = new SolidBrush(Color.FromArgb(110, 231, 183));
            g.FillPath(pillFill, pillPath);
            g.DrawPath(pillBorder, pillPath);
            g.DrawString(statusText, pillFont, pillTextBrush, pillRect.X + 8, pillRect.Y + 3);
        }

        // Outer glowing frame + White Rounded QR Card
        var qrOuter = new Rectangle(91, 110, 228, 228);
        using (var glowPath = AppIconFactory.RoundedRect(new Rectangle(87, 106, 236, 236), 24))
        using (var glowPen = new Pen(Color.FromArgb(55, 56, 189, 248), 2f))
        {
            g.DrawPath(glowPen, glowPath);
        }
        using (var qrCardPath = AppIconFactory.RoundedRect(qrOuter, 20))
        using (var whiteBrush = new SolidBrush(Color.White))
        {
            g.FillPath(whiteBrush, qrCardPath);
        }

        using (var subHintFont = new Font("Segoe UI", 8.8f))
        using (var mutedBrush = new SolidBrush(Color.FromArgb(148, 163, 184)))
        {
            var sf = new StringFormat { Alignment = StringAlignment.Center };
            g.DrawString(
                "Escanea el código QR desde la app móvil o vincula por Wi-Fi",
                subHintFont,
                mutedBrush,
                new RectangleF(20, 350, 370, 20),
                sf);
        }

        // Two modern side-by-side metric cards (IP/Port & Token)
        var ipCard = new Rectangle(28, 380, 198, 72);
        var tokenCard = new Rectangle(236, 380, 146, 72);

        DrawMetricCard(g, ipCard, "DIRECCIÓN IP / PUERTO", _currentIpPort, Color.White, 11.2f);
        DrawMetricCard(g, tokenCard, "TOKEN DE ACCESO", _currentToken, Color.FromArgb(56, 189, 248), 14.5f);
    }

    private static void DrawMetricCard(Graphics g, Rectangle rect, string label, string value, Color valueColor, float fontSize)
    {
        using var path = AppIconFactory.RoundedRect(rect, 14);
        using var fill = new SolidBrush(Color.FromArgb(19, 27, 46));
        using var border = new Pen(Color.FromArgb(38, 52, 79), 1f);
        g.FillPath(fill, path);
        g.DrawPath(border, path);

        using var labelFont = new Font("Segoe UI Semibold", 7.3f, FontStyle.Bold);
        using var labelBrush = new SolidBrush(Color.FromArgb(100, 116, 139));
        g.DrawString(label, labelFont, labelBrush, rect.X + 14, rect.Y + 11);

        using var valFont = new Font("Consolas", fontSize, FontStyle.Bold);
        using var valBrush = new SolidBrush(valueColor);
        g.DrawString(value, valFont, valBrush, rect.X + 13, rect.Y + 32);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _qrBox.Image?.Dispose();
            _brandBitmap.Dispose();
        }
        base.Dispose(disposing);
    }
}

internal sealed class ModernButton : Control
{
    public bool IsPrimary { get; set; }
    public bool UseSuccessTone { get; set; }
    private bool _hovered;
    private bool _pressed;

    public ModernButton()
    {
        SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.SupportsTransparentBackColor,
            true);
        BackColor = Color.Transparent;
        Cursor = Cursors.Hand;
        Font = new Font("Segoe UI Semibold", 9.8f, FontStyle.Bold);
    }

    protected override void OnMouseEnter(EventArgs e) { _hovered = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hovered = false; _pressed = false; Invalidate(); base.OnMouseLeave(e); }
    protected override void OnMouseDown(MouseEventArgs e) { _pressed = true; Invalidate(); base.OnMouseDown(e); }
    protected override void OnMouseUp(MouseEventArgs e) { _pressed = false; Invalidate(); base.OnMouseUp(e); }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

        var rect = new Rectangle(0, 0, Width - 1, Height - 1);
        using var path = AppIconFactory.RoundedRect(rect, 12);

        if (UseSuccessTone)
        {
            using var brush = new LinearGradientBrush(rect, Color.FromArgb(16, 185, 129), Color.FromArgb(5, 150, 105), 0f);
            g.FillPath(brush, path);
        }
        else if (IsPrimary)
        {
            var c1 = _pressed ? Color.FromArgb(29, 78, 216) : _hovered ? Color.FromArgb(59, 130, 246) : Color.FromArgb(37, 99, 235);
            var c2 = _pressed ? Color.FromArgb(2, 132, 199) : _hovered ? Color.FromArgb(56, 189, 248) : Color.FromArgb(14, 165, 233);
            using var brush = new LinearGradientBrush(rect, c1, c2, 0f);
            g.FillPath(brush, path);
        }
        else
        {
            var bg = _pressed ? Color.FromArgb(15, 23, 42) : _hovered ? Color.FromArgb(30, 41, 59) : Color.FromArgb(19, 27, 46);
            using var brush = new SolidBrush(bg);
            using var pen = new Pen(Color.FromArgb(51, 65, 85), 1f);
            g.FillPath(brush, path);
            g.DrawPath(pen, path);
        }

        var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
        using var textBrush = new SolidBrush(Color.White);
        g.DrawString(Text, Font, textBrush, new RectangleF(0, 0, Width, Height), sf);
    }
}
