import SwiftUI

public enum SignatureTheme {
    // MARK: - Spacing
    public enum Spacing {
        public static let xs: CGFloat = 4
        public static let s: CGFloat = 8
        public static let m: CGFloat = 12
        public static let l: CGFloat = 16
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
    }

    // MARK: - Corner Radius
    public enum Radius {
        public static let small: CGFloat = 10
        public static let medium: CGFloat = 16
        public static let large: CGFloat = 24
        public static let pill: CGFloat = 28
    }

    // MARK: - Shadows
    public enum Shadow {
        public static func soft(_ colorScheme: ColorScheme) -> ShadowStyle {
            ShadowStyle(color: Color.black.opacity(colorScheme == .dark ? 0.6 : 0.15), radius: 16, y: 8)
        }

        public static func crisp(_ colorScheme: ColorScheme) -> ShadowStyle {
            ShadowStyle(color: Color.black.opacity(colorScheme == .dark ? 0.5 : 0.2), radius: 8, y: 4)
        }
    }

    // MARK: - Colors
    public enum Colors {
        // Emerald accent, not blue
        public static func accent(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.40, green: 0.86, blue: 0.66) : Color(red: 0.02, green: 0.55, blue: 0.46)
        }

        public static func accentMuted(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.28, green: 0.64, blue: 0.52) : Color(red: 0.75, green: 0.93, blue: 0.86)
        }

        // Warm neutrals and charcoals
        public static func background(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.06, green: 0.07, blue: 0.08) : Color(red: 0.98, green: 0.98, blue: 0.97)
        }

        public static func surface(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.12, green: 0.13, blue: 0.14) : Color(red: 0.99, green: 0.99, blue: 0.985)
        }

        public static func surfaceElevated(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.16, green: 0.17, blue: 0.19) : Color(red: 0.97, green: 0.97, blue: 0.96)
        }

        public static func separator(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color.white.opacity(0.08) : Color.black.opacity(0.08)
        }

        public static func textPrimary(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color.white.opacity(0.92) : Color.black.opacity(0.88)
        }

        public static func textSecondary(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color.white.opacity(0.72) : Color.black.opacity(0.65)
        }

        public static func critical(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 0.98, green: 0.47, blue: 0.47) : Color(red: 0.80, green: 0.18, blue: 0.18)
        }

        public static func warning(_ colorScheme: ColorScheme) -> Color {
            colorScheme == .dark ? Color(red: 1.00, green: 0.80, blue: 0.40) : Color(red: 0.85, green: 0.58, blue: 0.12)
        }

        public static func success(_ colorScheme: ColorScheme) -> Color {
            accent(colorScheme)
        }
    }

    // MARK: - Typography helpers
    public enum TypeScale {
        public static func title(_ weight: Font.Weight = .semibold) -> Font { .system(.title2, design: .rounded).weight(weight) }
        public static func heading(_ weight: Font.Weight = .semibold) -> Font { .system(.headline, design: .rounded).weight(weight) }
        public static func body(_ weight: Font.Weight = .regular) -> Font { .system(.body, design: .rounded).weight(weight) }
        public static func label(_ weight: Font.Weight = .medium) -> Font { .system(.subheadline, design: .rounded).weight(weight) }
        public static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font { .system(size: size, weight: weight, design: .monospaced) }
    }
}

// MARK: - ShadowStyle
public struct ShadowStyle: Hashable {
    public var color: Color
    public var radius: CGFloat
    public var x: CGFloat = 0
    public var y: CGFloat
}

// MARK: - Background & Toolbar Helpers
public struct SignatureBackground: View {
    @Environment(\.colorScheme) private var colorScheme

    public init() {}

    public var body: some View {
        let base = SignatureTheme.Colors.background(colorScheme)
        let surface = SignatureTheme.Colors.surface(colorScheme)
        let accent = SignatureTheme.Colors.accentMuted(colorScheme)

        LinearGradient(colors: [base, surface])
            .overlay(
                AngularGradient(gradient: Gradient(colors: [accent.opacity(0.20), .clear, accent.opacity(0.10)]), center: .center)
                    .blur(radius: 60)
                    .opacity(0.7)
            )
            .ignoresSafeArea()
    }
}

public struct SignatureSurface: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.medium, style: .continuous)
                    .fill(SignatureTheme.Colors.surface(colorScheme))
            )
            .overlay(
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.medium, style: .continuous)
                    .stroke(SignatureTheme.Colors.separator(colorScheme))
            )
    }
}

public extension View {
    func signatureSurface() -> some View { modifier(SignatureSurface()) }

    func signatureToolbar(title: String? = nil) -> some View {
        modifier(SignatureToolbar(title: title))
    }
}

private struct SignatureToolbar: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    let title: String?

    func body(content: Content) -> some View {
        content
            .toolbarBackground(SignatureTheme.Colors.surface(colorScheme), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(colorScheme, for: .navigationBar)
            .toolbar {
                if let title {
                    ToolbarItem(placement: .principal) {
                        Text(title)
                            .font(SignatureTheme.TypeScale.heading())
                            .foregroundStyle(SignatureTheme.Colors.textPrimary(colorScheme))
                    }
                }
            }
    }
}

// MARK: - Previews
#Preview("Signature Theme Preview") {
    NavigationStack {
        ScrollView {
            VStack(alignment: .leading, spacing: SignatureTheme.Spacing.l) {
                Text("Signature Interface")
                    .font(SignatureTheme.TypeScale.title())
                Text("A professional, accessible look with emerald accents and warm neutrals.")
                    .font(SignatureTheme.TypeScale.body())
                    .foregroundStyle(.secondary)

                HStack(spacing: SignatureTheme.Spacing.m) {
                    ColorSwatch(label: "Accent") { scheme in SignatureTheme.Colors.accent(scheme) }
                    ColorSwatch(label: "Surface") { scheme in SignatureTheme.Colors.surface(scheme) }
                    ColorSwatch(label: "Background") { scheme in SignatureTheme.Colors.background(scheme) }
                }
            }
            .padding(SignatureTheme.Spacing.xl)
            .signatureSurface()
            .padding(SignatureTheme.Spacing.xl)
        }
        .background(SignatureBackground())
        .signatureToolbar(title: "Preview")
    }
}

private struct ColorSwatch: View {
    @Environment(\.colorScheme) private var colorScheme
    let label: String
    let color: (ColorScheme) -> Color

    var body: some View {
        VStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color(colorScheme))
                .frame(width: 64, height: 48)
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(SignatureTheme.Colors.separator(colorScheme))
                )
            Text(label).font(.caption)
        }
        .padding(6)
    }
}
