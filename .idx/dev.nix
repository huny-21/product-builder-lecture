{ pkgs, ... }: {
  # Let's install python and pip
  packages = [ pkgs.python311 pkgs.python311Packages.pip pkgs.nodejs ];
  # The following is specific to the python extension in your IDE
  # and helps it find the correct python interpreter.
  snippets = {
    "settings.json" = ''
      {
        "python.defaultInterpreterPath": "${pkgs.python311}/bin/python3.11"
      }
    '';
  };
}