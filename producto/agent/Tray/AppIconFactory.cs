using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace PCRemote.Agent.Tray;

public static class AppIconFactory
{
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyIcon(IntPtr hIcon);

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    public static void ApplyDarkTitleBar(IntPtr handle)
    {
        if (handle == IntPtr.Zero) return;
        try
        {
            int dark = 1;
            _ = DwmSetWindowAttribute(handle, 20, ref dark, sizeof(int)); // DWMWA_USE_IMMERSIVE_DARK_MODE

            int roundCorners = 2; // DWMWCP_ROUND
            _ = DwmSetWindowAttribute(handle, 33, ref roundCorners, sizeof(int)); // DWMWA_WINDOW_CORNER_PREFERENCE

            // COLORREF = 0x00BBGGRR for RGB(10, 14, 23) => 0x00170E0A
            int captionColor = 0x00170E0A;
            _ = DwmSetWindowAttribute(handle, 35, ref captionColor, sizeof(int)); // DWMWA_CAPTION_COLOR
        }
        catch
        {
            // Ignore on older Windows builds
        }
    }

    public static Icon CreateTrayIcon()
    {
        try
        {
            var exePath = Environment.ProcessPath;
            if (!string.IsNullOrWhiteSpace(exePath) && File.Exists(exePath))
            {
                var extracted = Icon.ExtractAssociatedIcon(exePath);
                if (extracted != null) return extracted;
            }
        }
        catch
        {
            // Fallback below
        }

        using var bmp = new Bitmap(32, 32);
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            using var bgBrush = new LinearGradientBrush(
                new Rectangle(0, 0, 32, 32),
                Color.FromArgb(11, 17, 32),
                Color.FromArgb(30, 58, 138),
                45f);
            using var path = RoundedRect(new Rectangle(1, 1, 30, 30), 8);
            g.FillPath(bgBrush, path);

            using var pen = new Pen(Color.FromArgb(56, 189, 248), 2.2f);
            g.DrawRectangle(pen, 6, 7, 16, 11);
            using var dotBrush = new SolidBrush(Color.FromArgb(52, 211, 153));
            g.FillEllipse(dotBrush, 18, 14, 8, 11);
        }

        var hIcon = bmp.GetHicon();
        try
        {
            using var tmp = Icon.FromHandle(hIcon);
            return (Icon)tmp.Clone();
        }
        finally
        {
            DestroyIcon(hIcon);
        }
    }

    public static GraphicsPath RoundedRect(Rectangle bounds, int radius)
    {
        int d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
        path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
        path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}
