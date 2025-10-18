import SwiftUI

// MARK: - Buttons
public struct SignatureButtonStyle: ButtonStyle {
    public enum Kind { case filled, tonal, outline, critical }
    let kind: Kind

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.colorScheme) private var colorScheme

    public init(_ kind: Kind = .filled) { self.kind = kind }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(SignatureTheme.TypeScale.label(.semibold))
            .padding(.vertical, SignatureTheme.Spacing.s)
            .padding(.horizontal, SignatureTheme.Spacing.l)
            .background(background(configuration: configuration))
            .overlay(overlayBorder)
            .foregroundStyle(foreground)
            .clipShape(RoundedRectangle(cornerRadius: SignatureTheme.Radius.pill, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(isEnabled ? 1 : 0.6)
            .accessibilityAddTraits(.isButton)
    }

    private var foreground: Color {
        switch kind {
        case .filled, .critical: return Color.white
        case .tonal: return SignatureTheme.Colors.textPrimary(colorScheme)
        case .outline: return SignatureTheme.Colors.accent(colorScheme)
        }
    }

    @ViewBuilder
    private func background(configuration: Configuration) -> some View {
        let accent = SignatureTheme.Colors.accent(colorScheme)
        let surface = SignatureTheme.Colors.surface(colorScheme)
        let critical = SignatureTheme.Colors.critical(colorScheme)

        switch kind {
        case .filled:
            LinearGradient(colors: [accent, accent.opacity(0.8)], startPoint: .top, endPoint: .bottom)
        case .tonal:
            surface
        case .outline:
            Color.clear
        case .critical:
            LinearGradient(colors: [critical, critical.opacity(0.85)], startPoint: .top, endPoint: .bottom)
        }
    }

    private var overlayBorder: some View {
        Group {
            switch kind {
            case .filled:
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.pill, style: .continuous)
                    .stroke(SignatureTheme.Colors.accentMuted(colorScheme), lineWidth: 1)
            case .tonal:
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.pill, style: .continuous)
                    .stroke(SignatureTheme.Colors.separator(colorScheme), lineWidth: 1)
            case .outline:
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.pill, style: .continuous)
                    .stroke(SignatureTheme.Colors.accent(colorScheme), lineWidth: 1.5)
            case .critical:
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.pill, style: .continuous)
                    .stroke(SignatureTheme.Colors.critical(colorScheme).opacity(0.9), lineWidth: 1)
            }
        }
    }
}

// MARK: - Card
public struct SignatureCard<Content: View>: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String?
    let content: Content

    public init(title: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: SignatureTheme.Spacing.m) {
            if let title {
                Text(title)
                    .font(SignatureTheme.TypeScale.heading())
                    .foregroundStyle(SignatureTheme.Colors.textPrimary(colorScheme))
            }
            content
        }
        .padding(SignatureTheme.Spacing.l)
        .background(
            RoundedRectangle(cornerRadius: SignatureTheme.Radius.large, style: .continuous)
                .fill(SignatureTheme.Colors.surface(colorScheme))
        )
        .overlay(
            RoundedRectangle(cornerRadius: SignatureTheme.Radius.large, style: .continuous)
                .stroke(SignatureTheme.Colors.separator(colorScheme))
        )
        .shadow(color: SignatureTheme.Shadow.soft(colorScheme).color,
                radius: SignatureTheme.Shadow.soft(colorScheme).radius,
                x: SignatureTheme.Shadow.soft(colorScheme).x,
                y: SignatureTheme.Shadow.soft(colorScheme).y)
    }
}

// MARK: - TextField Style
public struct SignatureTextFieldStyle: TextFieldStyle {
    @Environment(\.colorScheme) private var colorScheme
    public func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .textFieldStyle(.plain)
            .padding(.vertical, SignatureTheme.Spacing.s)
            .padding(.horizontal, SignatureTheme.Spacing.m)
            .background(
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.small, style: .continuous)
                    .fill(SignatureTheme.Colors.surfaceElevated(colorScheme))
            )
            .overlay(
                RoundedRectangle(cornerRadius: SignatureTheme.Radius.small, style: .continuous)
                    .stroke(SignatureTheme.Colors.separator(colorScheme))
            )
            .font(SignatureTheme.TypeScale.body())
            .foregroundStyle(SignatureTheme.Colors.textPrimary(colorScheme))
    }
}

// MARK: - Previews
#Preview("Components") {
    NavigationStack {
        VStack(alignment: .leading, spacing: SignatureTheme.Spacing.l) {
            SignatureCard(title: "Quick Actions") {
                HStack {
                    Button("Primary") {}.buttonStyle(SignatureButtonStyle(.filled))
                    Button("Tonal") {}.buttonStyle(SignatureButtonStyle(.tonal))
                    Button("Outline") {}.buttonStyle(SignatureButtonStyle(.outline))
                    Button("Delete") {}.buttonStyle(SignatureButtonStyle(.critical))
                }
            }

            SignatureCard(title: "Form") {
                VStack(alignment: .leading, spacing: SignatureTheme.Spacing.m) {
                    Text("Name").font(SignatureTheme.TypeScale.label())
                    TextField("Enter your name", text: .constant(""))
                        .textFieldStyle(SignatureTextFieldStyle())

                    Text("Notes").font(SignatureTheme.TypeScale.label())
                    TextEditor(text: .constant(""))
                        .frame(height: 120)
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: SignatureTheme.Radius.small, style: .continuous)
                                .fill(SignatureTheme.Colors.surfaceElevated(colorScheme))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: SignatureTheme.Radius.small, style: .continuous)
                                .stroke(SignatureTheme.Colors.separator(colorScheme))
                        )
                }
            }

            Spacer()
        }
        .padding(SignatureTheme.Spacing.xl)
        .background(SignatureBackground())
        .signatureToolbar(title: "Signature Components")
    }
}
